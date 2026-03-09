import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) => {
          cookies.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  // Routes publiques (OAuth callback)
  if (path.startsWith("/auth/callback")) {
    return response;
  }

  // Pas connecté → /login
  if (!user && !path.startsWith("/login")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Connecté + sur /login → /
  if (user && path.startsWith("/login")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Protection de la route /admin — vérifier platform_admins
  if (user && path.startsWith("/admin")) {
    const { data: adminData, error: adminError } = await supabase
      .from("platform_admins")
      .select("user_id")
      .eq("user_id", user.id)
      .single();

    // Si erreur DB (ex: table inexistante), laisser passer et laisser la page
    // gérer l'accès — évite une boucle de redirection silencieuse
    if (adminError && adminError.code !== "PGRST116") {
      console.error("[middleware] platform_admins error:", adminError.message);
      return response;
    }

    if (!adminData) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return response;
  }

  // Connecté + pas sur /onboarding ni /subscription → vérifier si membre d'une org
  if (user && !path.startsWith("/onboarding") && !path.startsWith("/subscription")) {
    const { data } = await supabase
      .from("organization_members")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!data) {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }
  }

  // Connecté + sur /onboarding → vérifier si déjà membre
  if (user && path.startsWith("/onboarding")) {
    const { data } = await supabase
      .from("organization_members")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (data) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
