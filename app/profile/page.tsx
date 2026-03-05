"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getCurrentMember, updateMemberName, updatePassword } from "@/lib/storage";
import { OrganizationMember } from "@/lib/types";

const ROLE_LABELS: Record<string, string> = {
  owner: "Patron", manager: "Chef de chantier", worker: "Ouvrier",
};
const ROLE_COLORS: Record<string, string> = {
  owner: "text-orange-400 bg-orange-400/10 border-orange-400/20",
  manager: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  worker: "text-gray-400 bg-gray-400/10 border-gray-400/20",
};

export default function ProfilePage() {
  const router = useRouter();
  const [member, setMember] = useState<OrganizationMember | null>(null);
  const [name, setName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nameSaved, setNameSaved] = useState(false);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentMember().then(me => {
      setMember(me);
      setName(me?.name ?? "");
      setLoading(false);
    });
  }, []);

  async function handleSaveName() {
    if (!name.trim()) return;
    await updateMemberName(name);
    setNameSaved(true);
    setTimeout(() => setNameSaved(false), 2000);
  }

  async function handleSavePassword() {
    setPasswordError("");
    if (newPassword.length < 6) { setPasswordError("Minimum 6 caractères."); return; }
    if (newPassword !== confirmPassword) { setPasswordError("Les mots de passe ne correspondent pas."); return; }
    await updatePassword(newPassword);
    setNewPassword("");
    setConfirmPassword("");
    setPasswordSaved(true);
    setTimeout(() => setPasswordSaved(false), 2000);
  }

  const inputClass = "w-full bg-white/[0.04] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-orange-500/50 transition-all";

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
      <p className="text-gray-700 text-sm">Chargement...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-gray-100">
      <header className="sticky top-0 z-30 border-b border-white/5 bg-[#0a0a0b]/80 backdrop-blur-xl">
        <div className="max-w-lg mx-auto px-5 h-14 flex items-center gap-4">
          <button onClick={() => router.push("/")} className="text-gray-600 hover:text-gray-300 transition-colors text-sm">←</button>
          <h1 className="font-semibold text-white">Mon profil</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-5 py-8 space-y-6">

        {/* Avatar + rôle */}
        <div className="flex items-center gap-4 bg-white/[0.03] border border-white/5 rounded-2xl p-6">
          <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-2xl font-bold text-orange-400">
            {member?.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-white text-lg">{member?.name}</p>
            {member && (
              <span className={`text-xs px-2 py-1 rounded-full border mt-1 inline-block ${ROLE_COLORS[member.role]}`}>
                {ROLE_LABELS[member.role]}
              </span>
            )}
          </div>
        </div>

        {/* Nom */}
        <section className="bg-white/[0.03] border border-white/5 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-widest">Nom affiché</p>
            {nameSaved && <span className="text-xs text-emerald-400">✓ Sauvegardé</span>}
          </div>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSaveName()}
            placeholder="Votre nom"
            className={inputClass}
          />
          <button
            onClick={handleSaveName}
            className="w-full py-2.5 bg-orange-500 hover:bg-orange-400 text-white font-semibold rounded-lg transition-colors text-sm shadow-lg shadow-orange-500/20"
          >
            Sauvegarder
          </button>
        </section>

        {/* Mot de passe */}
        <section className="bg-white/[0.03] border border-white/5 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-widest">Mot de passe</p>
            {passwordSaved && <span className="text-xs text-emerald-400">✓ Mis à jour</span>}
          </div>
          <input
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            placeholder="Nouveau mot de passe"
            className={inputClass}
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSavePassword()}
            placeholder="Confirmer le mot de passe"
            className={inputClass}
          />
          {passwordError && <p className="text-red-400 text-xs">{passwordError}</p>}
          <button
            onClick={handleSavePassword}
            className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 font-semibold rounded-lg transition-colors text-sm border border-white/10"
          >
            Changer le mot de passe
          </button>
        </section>

      </div>
    </div>
  );
}