"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  isPlatformAdmin,
  getAdminOrganizations,
  getSubscriptionPlans,
  adminUpdateOrgSubscription,
  adminRenameOrg,
  adminGetOrgMembers,
  adminUpdateMemberRole,
  adminRemoveMember,
  adminCreateInviteCode,
  AdminOrgMember,
} from "@/lib/storage";
import { AdminOrgView, SubscriptionPlan, SubscriptionStatus } from "@/lib/types";

const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  trial: "Essai",
  active: "Actif",
  expired: "Expiré",
  cancelled: "Annulé",
};

const STATUS_COLORS: Record<SubscriptionStatus, string> = {
  trial: "text-blue-400 bg-blue-400/10",
  active: "text-emerald-400 bg-emerald-400/10",
  expired: "text-red-400 bg-red-400/10",
  cancelled: "text-gray-400 bg-gray-400/10",
};

const ROLE_LABELS: Record<string, string> = {
  owner: "Propriétaire",
  manager: "Manager",
  worker: "Ouvrier",
};

type ActivePanel = "subscription" | "members" | null;

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [orgs, setOrgs] = useState<AdminOrgView[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [search, setSearch] = useState("");
  const [savedMsg, setSavedMsg] = useState("");

  // Subscription edit state
  const [activePanel, setActivePanel] = useState<{ orgId: string; panel: ActivePanel } | null>(null);
  const [editPlanId, setEditPlanId] = useState("");
  const [editStatus, setEditStatus] = useState<SubscriptionStatus>("active");
  const [editExpiry, setEditExpiry] = useState("");
  const [saving, setSaving] = useState(false);

  // Rename state
  const [renamingOrgId, setRenamingOrgId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // Members state
  const [membersMap, setMembersMap] = useState<Record<string, AdminOrgMember[]>>({});
  const [membersLoading, setMembersLoading] = useState<Record<string, boolean>>({});
  const [inviteCode, setInviteCode] = useState<{ orgId: string; code: string; role: string } | null>(null);

  useEffect(() => {
    isPlatformAdmin().then(isAdmin => {
      if (!isAdmin) { router.push("/"); return; }
      Promise.all([getAdminOrganizations(), getSubscriptionPlans()]).then(
        ([orgsData, plansData]) => {
          setOrgs(orgsData);
          setPlans(plansData);
          setLoading(false);
        }
      );
    });
  }, [router]);

  function showSaved(msg = "Modifications enregistrées ✓") {
    setSavedMsg(msg);
    setTimeout(() => setSavedMsg(""), 3000);
  }

  // ── Subscription ──────────────────────────────────────────

  function openSubscriptionPanel(org: AdminOrgView) {
    const current = activePanel?.orgId === org.id && activePanel.panel === "subscription";
    if (current) { setActivePanel(null); return; }
    const plan = plans.find(p => p.name === org.planName);
    setEditPlanId(plan?.id ?? "");
    setEditStatus(org.subscriptionStatus);
    setEditExpiry(org.subscriptionExpiresAt ? org.subscriptionExpiresAt.slice(0, 10) : "");
    setActivePanel({ orgId: org.id, panel: "subscription" });
  }

  async function handleSaveSubscription(orgId: string) {
    setSaving(true);
    await adminUpdateOrgSubscription(orgId, editPlanId, editStatus, editExpiry ? new Date(editExpiry).toISOString() : undefined);
    const updatedOrgs = await getAdminOrganizations();
    setOrgs(updatedOrgs);
    setActivePanel(null);
    setSaving(false);
    showSaved("Abonnement mis à jour ✓");
  }

  // ── Rename ────────────────────────────────────────────────

  function startRename(org: AdminOrgView) {
    setRenamingOrgId(org.id);
    setRenameValue(org.name);
  }

  async function handleRename(orgId: string) {
    if (!renameValue.trim()) return;
    setSaving(true);
    await adminRenameOrg(orgId, renameValue.trim());
    const updatedOrgs = await getAdminOrganizations();
    setOrgs(updatedOrgs);
    setRenamingOrgId(null);
    setSaving(false);
    showSaved("Nom mis à jour ✓");
  }

  // ── Members ───────────────────────────────────────────────

  async function openMembersPanel(org: AdminOrgView) {
    const current = activePanel?.orgId === org.id && activePanel.panel === "members";
    if (current) { setActivePanel(null); return; }
    setActivePanel({ orgId: org.id, panel: "members" });
    if (!membersMap[org.id]) {
      setMembersLoading(prev => ({ ...prev, [org.id]: true }));
      const members = await adminGetOrgMembers(org.id);
      setMembersMap(prev => ({ ...prev, [org.id]: members }));
      setMembersLoading(prev => ({ ...prev, [org.id]: false }));
    }
  }

  async function handleRoleChange(orgId: string, memberId: string, role: "owner" | "manager" | "worker") {
    await adminUpdateMemberRole(memberId, role);
    const updated = await adminGetOrgMembers(orgId);
    setMembersMap(prev => ({ ...prev, [orgId]: updated }));
    showSaved("Rôle mis à jour ✓");
  }

  async function handleRemoveMember(orgId: string, memberId: string) {
    await adminRemoveMember(memberId);
    const updated = await adminGetOrgMembers(orgId);
    setMembersMap(prev => ({ ...prev, [orgId]: updated }));
    const updatedOrgs = await getAdminOrganizations();
    setOrgs(updatedOrgs);
    showSaved("Membre supprimé ✓");
  }

  async function handleCreateInvite(orgId: string, role: "manager" | "worker") {
    const code = await adminCreateInviteCode(orgId, role);
    if (code) setInviteCode({ orgId, code, role });
  }

  // ── Render helpers ────────────────────────────────────────

  const inputClass = "bg-[#1a1a1e] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-orange-500/50 transition-all";
  const selectClass = `${inputClass} appearance-none cursor-pointer`;

  const filtered = orgs.filter(o =>
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    (o.ownerName ?? "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
        <p className="text-gray-600 text-sm">Chargement...</p>
      </div>
    );
  }

  const totalOrgs = orgs.length;
  const activeOrgs = orgs.filter(o => o.subscriptionStatus === "active").length;
  const trialOrgs = orgs.filter(o => o.subscriptionStatus === "trial").length;
  const mrr = orgs.filter(o => o.subscriptionStatus === "active").reduce((s, o) => s + o.priceMonthly, 0);

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-gray-100">

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/5 bg-[#0a0a0b]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push("/")} className="text-gray-600 hover:text-gray-300 transition-colors text-sm">
              ← App
            </button>
            <div className="w-px h-4 bg-white/10" />
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-400" />
              <h1 className="font-semibold text-white text-sm">Administration ChantierLog</h1>
            </div>
          </div>
          {savedMsg && (
            <span className="text-xs text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-3 py-1.5 rounded-lg">
              {savedMsg}
            </span>
          )}
        </div>
      </header>

      {/* Invite code modal */}
      {inviteCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#141416] border border-white/10 rounded-2xl p-6 w-full max-w-sm mx-4 space-y-4">
            <p className="font-semibold text-white text-sm">Code d&apos;invitation créé</p>
            <p className="text-xs text-gray-500">
              Rôle : <span className="text-gray-300">{ROLE_LABELS[inviteCode.role]}</span>
            </p>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <p className="text-3xl font-mono font-bold text-orange-400 tracking-widest">{inviteCode.code}</p>
            </div>
            <p className="text-xs text-gray-600">
              Partage ce code à l&apos;utilisateur. Il pourra l&apos;entrer lors de l&apos;onboarding pour rejoindre l&apos;organisation.
            </p>
            <button
              onClick={() => setInviteCode(null)}
              className="w-full py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-sm font-semibold rounded-lg transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Entreprises", value: totalOrgs, icon: "🏢" },
            { label: "Abonnements actifs", value: activeOrgs, icon: "✅" },
            { label: "En essai", value: trialOrgs, icon: "⏳" },
            { label: "MRR estimé", value: `${mrr.toFixed(0)} €`, icon: "💶" },
          ].map(kpi => (
            <div key={kpi.label} className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">{kpi.icon}</span>
                <p className="text-xs text-gray-600">{kpi.label}</p>
              </div>
              <p className="text-2xl font-bold text-white">{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Plans disponibles */}
        <section>
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-widest mb-4">Plans disponibles</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {plans.map(plan => (
              <div key={plan.id} className="bg-white/[0.03] border border-white/5 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-white text-sm">{plan.label}</p>
                  <p className="text-xs text-orange-400">{plan.priceMonthly > 0 ? `${plan.priceMonthly} €/mois` : "Gratuit"}</p>
                </div>
                <div className="space-y-1 text-xs text-gray-600">
                  <p>{plan.maxProjects === -1 ? "Projets illimités" : `${plan.maxProjects} projets max`}</p>
                  <p>{plan.maxPhotosPerLog} photos/note</p>
                  <p>{plan.maxMembers === -1 ? "Équipe illimitée" : `${plan.maxMembers} membres`}</p>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {plan.voiceNotes && <span className="bg-white/5 rounded px-1.5 py-0.5">🎙 Vocal</span>}
                    {plan.aiSummary && <span className="bg-white/5 rounded px-1.5 py-0.5">✨ IA</span>}
                    {plan.pdfExport && <span className="bg-white/5 rounded px-1.5 py-0.5">📄 PDF</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Liste des entreprises */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-widest">
              Entreprises ({filtered.length})
            </p>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher..."
              className={`${inputClass} w-56`}
            />
          </div>

          <div className="space-y-2">
            {filtered.map(org => {
              const isSubPanel = activePanel?.orgId === org.id && activePanel.panel === "subscription";
              const isMemberPanel = activePanel?.orgId === org.id && activePanel.panel === "members";
              const members = membersMap[org.id] ?? [];
              const isLoadingMembers = membersLoading[org.id];

              return (
                <div key={org.id} className="bg-white/[0.03] border border-white/5 rounded-xl overflow-hidden">

                  {/* Ligne principale */}
                  <div className="flex items-center gap-3 px-5 py-4 flex-wrap">

                    {/* Nom + owner */}
                    <div className="flex-1 min-w-0">
                      {renamingOrgId === org.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            value={renameValue}
                            onChange={e => setRenameValue(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") handleRename(org.id); if (e.key === "Escape") setRenamingOrgId(null); }}
                            className={`${inputClass} text-sm py-1 px-2`}
                            autoFocus
                          />
                          <button
                            onClick={() => handleRename(org.id)}
                            disabled={saving}
                            className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold disabled:opacity-50"
                          >
                            OK
                          </button>
                          <button onClick={() => setRenamingOrgId(null)} className="text-xs text-gray-500 hover:text-gray-300">✕</button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-white text-sm truncate">{org.name}</p>
                          <button
                            onClick={() => startRename(org)}
                            className="text-gray-600 hover:text-gray-300 transition-colors flex-shrink-0"
                            title="Renommer"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                        </div>
                      )}
                      {org.ownerName && <p className="text-xs text-gray-600 truncate mt-0.5">{org.ownerName}</p>}
                    </div>

                    {/* Stats */}
                    <div className="hidden sm:flex items-center gap-4 text-xs text-gray-600">
                      <span>{org.memberCount} membre{org.memberCount > 1 ? "s" : ""}</span>
                      <span>{org.projectCount} projet{org.projectCount > 1 ? "s" : ""}</span>
                    </div>

                    {/* Plan + statut */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-300 bg-white/5 border border-white/5 rounded-lg px-2 py-1">
                        {org.planLabel}
                      </span>
                      <span className={`text-xs font-medium px-2 py-1 rounded-lg ${STATUS_COLORS[org.subscriptionStatus]}`}>
                        {STATUS_LABELS[org.subscriptionStatus]}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openMembersPanel(org)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                          isMemberPanel
                            ? "bg-white/10 border-white/20 text-white"
                            : "border-white/5 text-gray-500 hover:text-gray-300 hover:border-white/10"
                        }`}
                      >
                        Membres
                      </button>
                      <button
                        onClick={() => openSubscriptionPanel(org)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                          isSubPanel
                            ? "bg-white/10 border-white/20 text-white"
                            : "border-white/5 text-gray-500 hover:text-gray-300 hover:border-white/10"
                        }`}
                      >
                        Abonnement
                      </button>
                    </div>
                  </div>

                  {/* Panel membres */}
                  {isMemberPanel && (
                    <div className="border-t border-white/5 bg-[#0e0e10] px-5 py-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-widest">
                          Membres — {org.name}
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCreateInvite(org.id, "worker")}
                            className="text-xs px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 text-gray-300 font-semibold rounded-lg transition-colors"
                          >
                            + Ouvrier
                          </button>
                          <button
                            onClick={() => handleCreateInvite(org.id, "manager")}
                            className="text-xs px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 text-orange-300 font-semibold rounded-lg transition-colors"
                          >
                            + Manager
                          </button>
                        </div>
                      </div>

                      {isLoadingMembers ? (
                        <p className="text-xs text-gray-600 py-2">Chargement des membres...</p>
                      ) : members.length === 0 ? (
                        <p className="text-xs text-gray-600 py-2">Aucun membre.</p>
                      ) : (
                        <div className="space-y-2">
                          {members.map(member => (
                            <div key={member.id} className="flex items-center gap-3 bg-white/[0.02] border border-white/5 rounded-lg px-3 py-2.5">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-200 font-medium truncate">{member.name}</p>
                                <p className="text-xs text-gray-600 font-mono truncate">{member.userId}</p>
                              </div>
                              <select
                                value={member.role}
                                onChange={e => handleRoleChange(org.id, member.id, e.target.value as "owner" | "manager" | "worker")}
                                className={`${selectClass} text-xs py-1 px-2`}
                              >
                                <option value="owner">Propriétaire</option>
                                <option value="manager">Manager</option>
                                <option value="worker">Ouvrier</option>
                              </select>
                              <button
                                onClick={() => handleRemoveMember(org.id, member.id)}
                                className="text-gray-600 hover:text-red-400 transition-colors flex-shrink-0"
                                title="Supprimer le membre"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-gray-700">
                        Le bouton &quot;+ Ouvrier&quot; / &quot;+ Manager&quot; génère un code à partager. L&apos;utilisateur l&apos;entre lors de l&apos;onboarding.
                      </p>
                    </div>
                  )}

                  {/* Panel abonnement */}
                  {isSubPanel && (
                    <div className="border-t border-white/5 bg-[#0e0e10] px-5 py-4 space-y-4">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-widest">
                        Modifier l&apos;abonnement — {org.name}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Plan</label>
                          <select
                            value={editPlanId}
                            onChange={e => setEditPlanId(e.target.value)}
                            className={`w-full ${selectClass}`}
                          >
                            {plans.map(p => (
                              <option key={p.id} value={p.id}>
                                {p.label} — {p.priceMonthly > 0 ? `${p.priceMonthly} €/mois` : "Gratuit"}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Statut</label>
                          <select
                            value={editStatus}
                            onChange={e => setEditStatus(e.target.value as SubscriptionStatus)}
                            className={`w-full ${selectClass}`}
                          >
                            <option value="trial">Essai gratuit</option>
                            <option value="active">Actif</option>
                            <option value="expired">Expiré</option>
                            <option value="cancelled">Annulé</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Date d&apos;expiration</label>
                          <input
                            type="date"
                            value={editExpiry}
                            onChange={e => setEditExpiry(e.target.value)}
                            className={`w-full ${inputClass}`}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveSubscription(org.id)}
                          disabled={saving || !editPlanId}
                          className="px-4 py-2 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
                        >
                          {saving ? "Enregistrement..." : "Sauvegarder"}
                        </button>
                        <button
                          onClick={() => setActivePanel(null)}
                          className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-400 text-sm font-semibold rounded-lg transition-colors"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {filtered.length === 0 && (
              <div className="text-center py-12 text-gray-700 text-sm">
                Aucune entreprise trouvée.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
