"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const FEATURES = [
  {
    icon: "📋",
    title: "Journal de chantier numérique",
    description: "Notes quotidiennes, photos, champs personnalisés par métier. Tout centralisé, accessible partout.",
  },
  {
    icon: "👷",
    title: "Gestion d'équipe multi-rôles",
    description: "Patron, chef de chantier, ouvrier. Chacun voit ce qu'il doit voir, rien de plus.",
  },
  {
    icon: "📊",
    title: "Statistiques & rapports PDF",
    description: "Activité par employé, communes les plus actives, export PDF professionnel en un clic.",
  },
];

const STATS = [
  { value: "100%", label: "Numérique" },
  { value: "3",    label: "Rôles utilisateurs" },
  { value: "∞",    label: "Projets" },
];

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [signupDone, setSignupDone] = useState(false);

  async function handleSubmit() {
    setError("");
    setLoading(true);

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError("Email ou mot de passe incorrect.");
      } else {
        router.push("/");
        router.refresh();
      }
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError("Erreur lors de la création du compte.");
      } else {
        setSignupDone(true);
      }
    }
    setLoading(false);
  }

  const inputClass = "w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-orange-500/50 focus:bg-white/[0.06] transition-all";

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-gray-100 flex">

      {/* ── Côté gauche — Marketing ── */}
      <div className="hidden lg:flex flex-col w-[55%] relative overflow-hidden border-r border-white/5 px-16 py-12">

        {/* Grain texture */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")", backgroundSize: "128px" }}
        />

        {/* Glow */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-orange-500/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-orange-500/3 rounded-full blur-[80px] pointer-events-none" />

        {/* Logo */}
        <div className="relative flex items-center gap-3 mb-auto">
          <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center text-lg shadow-lg shadow-orange-500/30">
            🔨
          </div>
          <span className="font-semibold text-white text-lg tracking-tight">ChantierLog</span>
        </div>

        {/* Hero text */}
        <div className="relative flex-1 flex flex-col justify-center space-y-10 py-12">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-full px-3 py-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
              <span className="text-xs text-orange-400 font-medium">Conçu pour les pros du bâtiment</span>
            </div>
            <h1 className="text-5xl font-bold text-white leading-[1.1] tracking-tight">
              Le journal de<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">
                chantier
              </span>{" "}
              qui<br />
              suit le rythme.
            </h1>
            <p className="text-gray-500 text-lg leading-relaxed max-w-md">
              Fini les carnets perdus. Notes, photos, équipes et rapports PDF — tout en un, depuis nimporte quel appareil.
            </p>
          </div>

          {/* Stats */}
          <div className="flex gap-8">
            {STATS.map(s => (
              <div key={s.label}>
                <p className="text-3xl font-bold text-white">{s.value}</p>
                <p className="text-xs text-gray-600 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Features */}
          <div className="space-y-4">
            {FEATURES.map(f => (
              <div key={f.title} className="flex gap-4 items-start group">
                <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/5 flex items-center justify-center text-base flex-shrink-0 group-hover:border-orange-500/20 transition-colors">
                  {f.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-200">{f.title}</p>
                  <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{f.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer quote */}
        <div className="relative border-t border-white/5 pt-6">
          <p className="text-xs text-gray-700 leading-relaxed">
            ChantierLog nous a permis de réduire les oublis et de mieux suivre nos équipes sur le terrain.
          </p>
          <p className="text-xs text-gray-600 mt-1">— Responsable de chantier, BTP Rhône-Alpes</p>
        </div>
      </div>

      {/* ── Côté droit — Auth ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative">

        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-3 mb-12">
          <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center text-lg shadow-lg shadow-orange-500/30">🔨</div>
          <span className="font-semibold text-white text-lg">ChantierLog</span>
        </div>

        <div className="w-full max-w-sm space-y-8">

          {signupDone ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-3xl mx-auto">
                ✓
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Compte créé !</h2>
                <p className="text-sm text-gray-500 mt-2">
                  Vérifiez votre email pour confirmer votre compte, puis connectez-vous.
                </p>
              </div>
              <button
                onClick={() => { setMode("login"); setSignupDone(false); }}
                className="w-full py-3 bg-orange-500 hover:bg-orange-400 text-white font-semibold rounded-xl transition-colors text-sm shadow-lg shadow-orange-500/20"
              >
                Se connecter
              </button>
            </div>
          ) : (
            <>
              {/* Tabs */}
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">
                  {mode === "login" ? "Bon retour 👋" : "Créer un compte"}
                </h2>
                <p className="text-sm text-gray-600">
                  {mode === "login"
                    ? "Connectez-vous à votre espace ChantierLog."
                    : "Rejoignez ChantierLog gratuitement."}
                </p>
              </div>

              {/* Switcher */}
              <div className="flex bg-white/[0.03] border border-white/5 rounded-xl p-1">
                <button
                  onClick={() => { setMode("login"); setError(""); }}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                    mode === "login"
                      ? "bg-white/10 text-white shadow"
                      : "text-gray-600 hover:text-gray-400"
                  }`}
                >
                  Connexion
                </button>
                <button
                  onClick={() => { setMode("signup"); setError(""); }}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                    mode === "signup"
                      ? "bg-white/10 text-white shadow"
                      : "text-gray-600 hover:text-gray-400"
                  }`}
                >
                  Inscription
                </button>
              </div>

              {/* Form */}
              <div className="space-y-3">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Email professionnel"
                  className={inputClass}
                />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSubmit()}
                  placeholder="Mot de passe"
                  className={inputClass}
                />
                {error && (
                  <div className="flex items-center gap-2 text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                    <span>⚠</span>
                    <span>{error}</span>
                  </div>
                )}
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full py-3 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white font-semibold rounded-xl transition-all text-sm shadow-lg shadow-orange-500/20 mt-2"
                >
                  {loading
                    ? "..."
                    : mode === "login"
                    ? "Se connecter →"
                    : "Créer mon compte →"}
                </button>
              </div>

              {mode === "login" && (
                <p className="text-center text-xs text-gray-700">
                  Pas encore de compte ?{" "}
                  <button onClick={() => { setMode("signup"); setError(""); }} className="text-orange-400 hover:text-orange-300 transition-colors">
                    Sinscrire gratuitement
                  </button>
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}