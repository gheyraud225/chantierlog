"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  getCurrentMember,
  getOrganization,
  getOrgSubscriptionPlan,
  getSubscriptionPlans,
} from "@/lib/storage";
import { OrganizationMember, Organization, SubscriptionPlan } from "@/lib/types";

const PLAN_ICONS: Record<string, string> = {
  free: "🆓",
  starter: "🚀",
  pro: "⚡",
  enterprise: "🏢",
};

type FeatureRow = {
  label: string;
  free: string | boolean;
  starter: string | boolean;
  pro: string | boolean;
  enterprise: string | boolean;
};

const FEATURES: FeatureRow[] = [
  { label: "Projets",          free: "3",          starter: "15",         pro: "Illimités",   enterprise: "Illimités" },
  { label: "Photos par note",  free: "3",          starter: "5",          pro: "10",          enterprise: "20" },
  { label: "Membres",          free: "5",          starter: "15",         pro: "Illimités",   enterprise: "Illimités" },
  { label: "Notes vocales",    free: false,         starter: true,         pro: true,          enterprise: true },
  { label: "Export PDF",       free: false,         starter: true,         pro: true,          enterprise: true },
  { label: "Champs personnalisés", free: false,     starter: true,         pro: true,          enterprise: true },
  { label: "Résumé IA",        free: false,         starter: false,        pro: true,          enterprise: true },
  { label: "Support",          free: "Communauté", starter: "Email",      pro: "Prioritaire", enterprise: "Dédié" },
];

export default function SubscriptionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<OrganizationMember | null>(null);
  const [org, setOrg] = useState<Organization | null>(null);
  const [currentPlan, setCurrentPlan] = useState<SubscriptionPlan | null>(null);
  const [allPlans, setAllPlans] = useState<SubscriptionPlan[]>([]);

  useEffect(() => {
    Promise.all([
      getCurrentMember(),
      getOrganization(),
      getOrgSubscriptionPlan(),
      getSubscriptionPlans(),
    ]).then(([m, o, plan, plans]) => {
      setMember(m);
      setOrg(o);
      setCurrentPlan(plan);
      setAllPlans(plans);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
        <p className="text-gray-600 text-sm">Chargement...</p>
      </div>
    );
  }

  const isOwner = member?.role === "owner";
  const trialEnd = org?.trialEndsAt ? new Date(org.trialEndsAt) : null;
  const trialDaysLeft = trialEnd
    ? Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / 86400000))
    : null;
  const statusLabel: Record<string, string> = {
    trial: "Période d'essai",
    active: "Actif",
    expired: "Expiré",
    cancelled: "Annulé",
  };

  function renderFeatureValue(val: string | boolean) {
    if (val === true) return <span className="text-emerald-400">✓</span>;
    if (val === false) return <span className="text-gray-700">—</span>;
    return <span className="text-gray-300 text-xs">{val}</span>;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-gray-100">

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/5 bg-[#0a0a0b]/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/")} className="text-gray-600 hover:text-gray-300 transition-colors text-sm">
              ←
            </button>
            <h1 className="font-semibold text-white text-sm">Abonnement</h1>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-10 space-y-10">

        {/* Abonnement actuel */}
        <section className="bg-white/[0.03] border border-white/5 rounded-2xl p-6 space-y-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs text-gray-600 uppercase tracking-widest mb-2">Abonnement actuel</p>
              <div className="flex items-center gap-3">
                <span className="text-3xl">{PLAN_ICONS[currentPlan?.name ?? "free"] ?? "📦"}</span>
                <div>
                  <h2 className="text-2xl font-bold text-white">{currentPlan?.label ?? "Gratuit"}</h2>
                  <p className="text-sm text-gray-500">
                    {currentPlan && currentPlan.priceMonthly > 0
                      ? `${currentPlan.priceMonthly} €/mois`
                      : "Gratuit"}
                  </p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <span className={`text-xs font-medium px-3 py-1.5 rounded-lg ${
                org?.subscriptionStatus === "active"   ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                org?.subscriptionStatus === "trial"    ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                org?.subscriptionStatus === "expired"  ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                "bg-gray-500/10 text-gray-400 border border-gray-500/20"
              }`}>
                {statusLabel[org?.subscriptionStatus ?? "trial"] ?? "Inconnu"}
              </span>
              {trialDaysLeft !== null && org?.subscriptionStatus === "trial" && (
                <p className="text-xs text-gray-600 mt-1">
                  {trialDaysLeft > 0 ? `${trialDaysLeft} jour${trialDaysLeft > 1 ? "s" : ""} restant${trialDaysLeft > 1 ? "s" : ""}` : "Essai expiré"}
                </p>
              )}
              {org?.subscriptionExpiresAt && org.subscriptionStatus === "active" && (
                <p className="text-xs text-gray-600 mt-1">
                  Renouvellement le {new Date(org.subscriptionExpiresAt).toLocaleDateString("fr-FR")}
                </p>
              )}
            </div>
          </div>

          {/* Usage */}
          <div className="grid grid-cols-3 gap-3 pt-2 border-t border-white/5">
            {[
              {
                label: "Projets",
                limit: currentPlan?.maxProjects ?? 3,
              },
              {
                label: "Photos / note",
                limit: currentPlan?.maxPhotosPerLog ?? 3,
              },
              {
                label: "Membres",
                limit: currentPlan?.maxMembers ?? 5,
              },
            ].map(item => (
              <div key={item.label} className="bg-white/[0.02] rounded-xl p-3">
                <p className="text-xs text-gray-600 mb-1">{item.label}</p>
                <p className="text-lg font-bold text-white">
                  {item.limit === -1 ? "∞" : item.limit}
                </p>
              </div>
            ))}
          </div>

          {/* Features actives */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
            {currentPlan?.voiceNotes  && <span className="text-xs bg-white/5 border border-white/5 rounded-lg px-2.5 py-1.5">🎙 Notes vocales</span>}
            {currentPlan?.aiSummary   && <span className="text-xs bg-white/5 border border-white/5 rounded-lg px-2.5 py-1.5">✨ Résumé IA</span>}
            {currentPlan?.pdfExport   && <span className="text-xs bg-white/5 border border-white/5 rounded-lg px-2.5 py-1.5">📄 Export PDF</span>}
            {currentPlan?.customFields && <span className="text-xs bg-white/5 border border-white/5 rounded-lg px-2.5 py-1.5">⚙️ Champs personnalisés</span>}
          </div>

          {!isOwner && (
            <p className="text-xs text-gray-600 border-t border-white/5 pt-3">
              Seul le propriétaire de l&apos;organisation peut modifier l&apos;abonnement.
            </p>
          )}
          {isOwner && (
            <p className="text-xs text-gray-600 border-t border-white/5 pt-3">
              Pour mettre à niveau ou changer de plan, contactez-nous à{" "}
              <a href="mailto:contact@chantierlog.app" className="text-orange-400 hover:text-orange-300">
                contact@chantierlog.app
              </a>
            </p>
          )}
        </section>

        {/* Comparatif des plans */}
        <section>
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-widest mb-5">
            Comparer les plans
          </p>

          {/* Header plans */}
          <div className="grid grid-cols-5 gap-2 mb-3">
            <div /> {/* label column */}
            {allPlans.map(plan => (
              <div
                key={plan.id}
                className={`text-center p-3 rounded-xl border ${
                  plan.id === currentPlan?.id
                    ? "border-orange-500/30 bg-orange-500/5"
                    : "border-white/5 bg-white/[0.02]"
                }`}
              >
                <p className="text-xl mb-1">{PLAN_ICONS[plan.name] ?? "📦"}</p>
                <p className="text-xs font-semibold text-white">{plan.label}</p>
                <p className="text-xs text-gray-600 mt-0.5">
                  {plan.priceMonthly > 0 ? `${plan.priceMonthly} €/mois` : "Gratuit"}
                </p>
                {plan.id === currentPlan?.id && (
                  <span className="text-xs text-orange-400 font-medium">Actuel</span>
                )}
              </div>
            ))}
          </div>

          {/* Rows */}
          {FEATURES.map((row, i) => (
            <div
              key={row.label}
              className={`grid grid-cols-5 gap-2 py-3 ${i < FEATURES.length - 1 ? "border-b border-white/5" : ""}`}
            >
              <p className="text-xs text-gray-500 self-center">{row.label}</p>
              {(["free", "starter", "pro", "enterprise"] as const).map(planName => (
                <div
                  key={planName}
                  className={`text-center self-center ${
                    allPlans.find(p => p.name === planName)?.id === currentPlan?.id
                      ? "opacity-100"
                      : "opacity-60"
                  }`}
                >
                  {renderFeatureValue(row[planName])}
                </div>
              ))}
            </div>
          ))}
        </section>

        {/* CTA contact */}
        <section className="bg-gradient-to-r from-orange-500/10 to-orange-600/5 border border-orange-500/20 rounded-2xl p-6 text-center space-y-3">
          <h3 className="text-lg font-bold text-white">Passer au niveau supérieur ?</h3>
          <p className="text-sm text-gray-500">
            Contactez-nous pour un devis personnalisé ou pour mettre à niveau votre abonnement.
          </p>
          <a
            href="mailto:contact@chantierlog.app?subject=Demande%20de%20mise%20à%20niveau%20abonnement"
            className="inline-block px-6 py-2.5 bg-orange-500 hover:bg-orange-400 text-white font-semibold rounded-xl text-sm transition-colors shadow-lg shadow-orange-500/20"
          >
            Nous contacter →
          </a>
        </section>
      </div>
    </div>
  );
}
