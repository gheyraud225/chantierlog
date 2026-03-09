import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Toaster } from "sonner";
import Link from "next/link";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ChantierLog",
  description: "Journal de chantier numérique",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ChantierLog",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#f97316",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={outfit.variable}>
      <body className={`${outfit.variable} antialiased`}>
        {children}
        <footer className="border-t border-white/[0.04] mt-auto py-5 px-4">
          <div className="flex flex-col items-center gap-2 text-center">
            <p className="text-xs text-gray-700">
              © {new Date().getFullYear()} ChantierLog — Projet Étudiant (NE) 🇨🇭
            </p>
            <div className="flex items-center gap-4 text-xs text-gray-700">
              <Link href="/confidentialite" className="hover:text-gray-500 transition-colors">
                Confidentialité
              </Link>
              <span className="text-gray-800">·</span>
              <Link href="/cgu" className="hover:text-gray-500 transition-colors">
                CGU
              </Link>
            </div>
          </div>
        </footer>
        <Toaster
          position="bottom-right"
          theme="dark"
          toastOptions={{
            style: {
              background: "#111113",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#e5e7eb",
              fontSize: "14px",
            },
          }}
        />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}