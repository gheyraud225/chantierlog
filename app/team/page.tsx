"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { OrganizationMember, InviteCode } from "@/lib/types";
import {
  getCurrentMember, getOrgMembers, createInviteCode,
  removeMember, updateMemberRole, updateOrganizationName, getOrganization
} from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import ConfirmDialog from "@/components/ConfirmDialog";

const ROLE_LABELS: Record<string, string> = {
  owner: "Patron", manager: "Chef de chantier", worker: "Ouvrier",
};
const ROLE_COLORS: Record<string, string> = {
  owner:   "text-orange-400 bg-orange-400/10 border-orange-400/20",
  manager: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  worker:  "text-gray-400 bg-gray-400/10 border-gray-400/20",
};

export default function TeamPage() {
  const router = useRouter();
  const [currentMember, setCurrentMember] = useState<OrganizationMember | null>(null);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [orgName, setOrgName] = useState("");
  const [editingOrgName, setEditingOrgName] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [loading, setLoading] = useState(true);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [orgNameSaved, setOrgNameSaved] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const [me, allMembers, org] = await Promise.all([
        getCurrentMember(), getOrgMembers(), getOrganization(),
      ]);
      setCurrentMember(me);
      setMembers(allMembers);
      setOrgName(org?.name ?? "");
      setNewOrgName(org?.name ?? "");

      if (me?.role === "owner") {
        const { data } = await supabase
          .from("invite_codes").select("*")
          .eq("organization_id", me.organizationId)
          .order("created_at", { ascending: false });

        setCodes((data ?? []).map(row => ({
          id: row.id, organizationId: row.organization_id,
          code: row.code, role: row.role, createdBy: row.created_by,
          usedBy: row.used_by, usedAt: row.used_at, createdAt: row.created_at,
        })));
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleGenerateCode(role: "manager" | "worker") {
    setGeneratingCode(true);
    const code = await createInviteCode(role);
    if (code) {
      const { data } = await supabase.from("invite_codes").select("*").eq("code", code).single();
      if (data) setCodes(prev => [{
        id: data.id, organizationId: data.organization_id,
        code: data.code, role: data.role, createdBy: data.created_by,
        usedBy: data.used_by, usedAt: data.used_at, createdAt: data.created_at,
      }, ...prev]);
    }
    setGeneratingCode(false);
  }

  async function handleRemoveMember(userId: string) {
    await removeMember(userId);
    setMembers(prev => prev.filter(m => m.userId !== userId));
    setConfirmRemoveId(null);
  }

  async function handleChangeRole(userId: string, currentRole: string) {
    const newRole = currentRole === "worker" ? "manager" : "worker";
    await updateMemberRole(userId, newRole as "manager" | "worker");
    setMembers(prev => prev.map(m => m.userId === userId ? { ...m, role: newRole as "manager" | "worker" } : m));
  }

  async function handleSaveOrgName() {
    if (!newOrgName.trim()) return;
    await updateOrganizationName(newOrgName);
    setOrgName(newOrgName);
    setEditingOrgName(false);
    setOrgNameSaved(true);
    setTimeout(() => setOrgNameSaved(false), 2000);
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  const inputClass = "bg-white/[0.04] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-orange-500/50 transition-all";

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
      <p className="text-gray-700 text-sm">Chargement...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-gray-100">
      <header className="sticky top-0 z-30 border-b border-white/5 bg-[#0a0a0b]/80 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto px-5 h-14 flex items-center gap-4">
          <button onClick={() => router.push("/")} className="text-gray-600 hover:text-gray-300 transition-colors text-sm">←</button>
          <div>
            <h1 className="font-semibold text-white">Mon équipe</h1>
            <p className="text-xs text-gray-600">{members.length} membre{members.length > 1 ? "s" : ""}</p>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-5 py-8 space-y-6">

        {/* Nom de l'organisation */}
        {currentMember?.role === "owner" && (
          <section className="bg-white/[0.03] border border-white/5 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-widest">Entreprise</p>
              {orgNameSaved && <span className="text-xs text-emerald-400">✓ Sauvegardé</span>}
            </div>
            {editingOrgName ? (
              <div className="flex gap-2">
                <input
                  value={newOrgName}
                  onChange={e => setNewOrgName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSaveOrgName()}
                  className={`flex-1 ${inputClass}`}
                />
                <button onClick={handleSaveOrgName} className="px-4 py-2 bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold rounded-lg transition-colors">OK</button>
                <button onClick={() => { setEditingOrgName(false); setNewOrgName(orgName); }} className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-400 text-sm font-semibold rounded-lg transition-colors">✕</button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="font-semibold text-white text-lg">{orgName}</p>
                <button onClick={() => setEditingOrgName(true)} className="text-xs text-gray-600 hover:text-gray-300 transition-colors">Modifier</button>
              </div>
            )}
          </section>
        )}

        {/* Codes d'invitation */}
        {currentMember?.role === "owner" && (
          <section className="bg-white/[0.03] border border-white/5 rounded-2xl p-6 space-y-4">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-widest">Inviter des membres</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleGenerateCode("manager")}
                disabled={generatingCode}
                className="py-3 bg-blue-500/10 hover:bg-blue-500/15 border border-blue-500/20 text-blue-400 text-sm font-semibold rounded-xl transition-colors disabled:opacity-40"
              >
                + Chef de chantier
              </button>
              <button
                onClick={() => handleGenerateCode("worker")}
                disabled={generatingCode}
                className="py-3 bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 text-gray-300 text-sm font-semibold rounded-xl transition-colors disabled:opacity-40"
              >
                + Ouvrier
              </button>
            </div>

            {codes.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-gray-700 uppercase tracking-widest">Codes générés</p>
                {codes.map(invite => (
                  <div
                    key={invite.id}
                    className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                      invite.usedBy ? "border-white/5 opacity-30" : "border-white/10 bg-white/[0.02]"
                    }`}
                  >
                    <div>
                      <span className="font-mono text-xl font-bold text-white tracking-[0.2em]">{invite.code}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${ROLE_COLORS[invite.role]}`}>
                          {ROLE_LABELS[invite.role]}
                        </span>
                        {invite.usedBy && <span className="text-xs text-gray-700">Utilisé</span>}
                      </div>
                    </div>
                    {!invite.usedBy && (
                      <button
                        onClick={() => copyCode(invite.code)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                          copiedCode === invite.code
                            ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                            : "border-white/10 text-gray-400 hover:border-orange-500/30 hover:text-orange-400"
                        }`}
                      >
                        {copiedCode === invite.code ? "✓ Copié" : "Copier"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Membres */}
        <section className="space-y-3">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-widest">Membres</p>
          {members.map(member => {
            const isMe = member.userId === currentMember?.userId;
            const isOwner = member.role === "owner";
            return (
              <div key={member.id} className="group bg-white/[0.03] hover:bg-white/[0.05] border border-white/5 rounded-2xl p-4 flex items-center justify-between transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-sm font-semibold text-gray-300">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-gray-100 text-sm">
                      {member.name}
                      {isMe && <span className="ml-2 text-xs text-gray-600">(moi)</span>}
                    </p>
                    <p className="text-xs text-gray-600">
                      Depuis le {new Date(member.createdAt).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-1 rounded-full border ${ROLE_COLORS[member.role]}`}>
                    {ROLE_LABELS[member.role]}
                  </span>
                  {currentMember?.role === "owner" && !isMe && !isOwner && (
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleChangeRole(member.userId, member.role)}
                        className="text-xs text-gray-600 hover:text-blue-400 transition-colors"
                        title={member.role === "worker" ? "Promouvoir chef" : "Rétrograder ouvrier"}
                      >
                        {member.role === "worker" ? "↑ Chef" : "↓ Ouvrier"}
                      </button>
                      <button
                        onClick={() => setConfirmRemoveId(member.userId)}
                        className="text-xs text-gray-600 hover:text-red-400 transition-colors"
                      >
                        Retirer
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      </div>

      {confirmRemoveId && (
        <ConfirmDialog
          message={`Retirer "${members.find(m => m.userId === confirmRemoveId)?.name}" de l'organisation ?`}
          onConfirm={() => handleRemoveMember(confirmRemoveId)}
          onCancel={() => setConfirmRemoveId(null)}
        />
      )}
    </div>
  );
}