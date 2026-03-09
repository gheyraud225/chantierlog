"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  isPlatformAdmin,
  getAdminOrganizations,
  getSubscriptionPlans,
  adminUpdateOrgSubscription,
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

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [orgs, setOrgs] = useState<AdminOrgView[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [search, setSearch] = useState("");
  const [editingOrgId, setEditingOrgId] = useState<string | null>(null);
  const [editPlanId, setEditPlanId] = useState("");
  const [editStatus, setEditStatus] = useState<SubscriptionStatus>("active");
  const [editExpiry, setEditExpiry] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  useEffect(() => {
    isPlatformAdmin().then(isAdmin => {
      if (!isAdmin) {
        router.push("/");
        return;
      }
      Promise.all([getAdminOrganizations(), getSubscriptionPlans()]).then(
        ([orgsData, plansData]) => {
          setOrgs(orgsData);
          setPlans(plansData);
          setLoading(false);
        }
      );
    });
  }, [router]);

  function openEdit(org: AdminOrgView) {
    setEditingOrgId(org.id);
    const plan = plans.find(p => p.name === org.planName);
    setEditPlanId(plan?.id ?? "");
    setEditStatus(org.subscriptionStatus);
    setEditExpiry(org.subscriptionExpiresAt ? org.subscriptionExpiresAt.slice(0, 10) : "");
  }

  async function handleSave(orgId: string) {
    setSaving(true);
    await adminUpdateOrgSubscription(
      orgId,
      editPlanId,
      editStatus,
      editExpiry ? new Date(editExpiry).toISOString() : undefined
    );
    // Refresh
    const updatedOrgs = await getAdminOrganizations();
    setOrgs(updatedOrgs);
    setEditingOrgId(null);
    setSaving(false);
    setSavedMsg("Abonnement mis à jour ✓");
    setTimeout(() => setSavedMsg(""), 3000);
  }

  const filtered = orgs.filter(o =>
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    (o.ownerName ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const inputClass = "bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-orange-500/50 transition-all";

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
        <p className="text-gray-600 text-sm">Chargement...</p>
      </div>
    );
  }

  // Stats globales
  const totalOrgs = orgs.length;
  const activeOrgs = orgs.filter(o => o.subscriptionStatus === "active").length;
  const trialOrgs = orgs.filter(o => o.subscriptionStatus === "trial").length;
  const mrr = orgs
    .filter(o => o.subscriptionStatus === "active")
    .reduce((sum, o) => sum + o.priceMonthly, 0);

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
            {filtered.map(org => (
              <div key={org.id} className="bg-white/[0.03] border border-white/5 rounded-xl overflow-hidden">

                {/* Ligne principale */}
                <div className="flex items-center gap-4 px-5 py-4">
                  {/* Nom + owner */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white text-sm truncate">{org.name}</p>
                    {org.ownerName && (
                      <p className="text-xs text-gray-600 truncate">{org.ownerName}</p>
                    )}
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

                  {/* Expiry */}
                  {org.subscriptionExpiresAt && (
                    <p className="hidden md:block text-xs text-gray-600">
                      Exp. {new Date(org.subscriptionExpiresAt).toLocaleDateString("fr-FR")}
                    </p>
                  )}

                  {/* Edit button */}
                  <button
                    onClick={() => editingOrgId === org.id ? setEditingOrgId(null) : openEdit(org)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                      editingOrgId === org.id
                        ? "bg-white/10 border-white/20 text-white"
                        : "border-white/5 text-gray-500 hover:text-gray-300 hover:border-white/10"
                    }`}
                  >
                    {editingOrgId === org.id ? "Fermer" : "Modifier"}
                  </button>
                </div>

                {/* Panel édition */}
                {editingOrgId === org.id && (
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
                          className={`w-full ${inputClass}`}
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
                          className={`w-full ${inputClass}`}
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
                        onClick={() => handleSave(org.id)}
                        disabled={saving || !editPlanId}
                        className="px-4 py-2 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
                      >
                        {saving ? "Enregistrement..." : "Sauvegarder"}
                      </button>
                      <button
                        onClick={() => setEditingOrgId(null)}
                        className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-400 text-sm font-semibold rounded-lg transition-colors"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

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
