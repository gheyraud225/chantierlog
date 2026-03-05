"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createOrganization, joinWithCode } from "@/lib/storage";

export default function OnboardingPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"choose" | "create" | "join">("choose");
  const [orgName, setOrgName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [code, setCode] = useState("");
  const [joinName, setJoinName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!orgName.trim() || !ownerName.trim()) return;
    setLoading(true);
    setError("");
    const org = await createOrganization(orgName, ownerName);
    if (!org) {
      setError("Erreur lors de la création. Réessaie.");
      setLoading(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  async function handleJoin() {
    if (!code.trim() || !joinName.trim()) return;
    setLoading(true);
    setError("");
    const success = await joinWithCode(code, joinName);
    if (!success) {
      setError("Code invalide ou déjà utilisé.");
      setLoading(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <div className="text-5xl mb-4">🔨</div>
          <h1 className="text-3xl font-bold text-orange-400">ChantierLog</h1>
          <p className="text-gray-500 text-sm mt-2">Bienvenue — configurons ton accès</p>
        </div>

        {mode === "choose" && (
          <div className="space-y-3">
            <button
              onClick={() => setMode("create")}
              className="w-full bg-orange-500 hover:bg-orange-400 text-white font-semibold py-4 rounded-xl transition-colors"
            >
              Créer mon entreprise
              <p className="text-xs font-normal opacity-75 mt-1">Je suis patron</p>
            </button>
            <button
              onClick={() => setMode("join")}
              className="w-full bg-gray-800 hover:bg-gray-700 text-white font-semibold py-4 rounded-xl transition-colors border border-gray-700"
            >
              Rejoindre une entreprise
              <p className="text-xs font-normal opacity-75 mt-1">Jai un code dinvitation</p>
            </button>
          </div>
        )}

        {mode === "create" && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              Créer mon entreprise
            </h2>
            <input
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Nom de l'entreprise (ex: Dupont BTP)"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
            />
            <input
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="Votre nom (ex: Jean Dupont)"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
            />
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <button
              onClick={handleCreate}
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-white font-semibold py-3 rounded-lg transition-colors text-sm"
            >
              {loading ? "Création..." : "Créer"}
            </button>
            <button
              onClick={() => { setMode("choose"); setError(""); }}
              className="w-full text-gray-500 hover:text-gray-300 text-sm transition-colors"
            >
              ← Retour
            </button>
          </div>
        )}

        {mode === "join" && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              Rejoindre une entreprise
            </h2>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Code d'invitation (ex: AB12CD)"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors font-mono tracking-widest"
            />
            <input
              value={joinName}
              onChange={(e) => setJoinName(e.target.value)}
              placeholder="Votre nom (ex: Marc Martin)"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
            />
            {error && <p className="text-red-400 text-xs">{error}</p>}
            <button
              onClick={handleJoin}
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-white font-semibold py-3 rounded-lg transition-colors text-sm"
            >
              {loading ? "Vérification..." : "Rejoindre"}
            </button>
            <button
              onClick={() => { setMode("choose"); setError(""); }}
              className="w-full text-gray-500 hover:text-gray-300 text-sm transition-colors"
            >
              ← Retour
            </button>
          </div>
        )}
      </div>
    </div>
  );
}