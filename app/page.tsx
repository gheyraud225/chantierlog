"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Project, ProjectStatus, OrganizationMember, NewProject, SubscriptionPlan, Organization } from "@/lib/types";
import {
  getProjects, addProject, deleteProject, getCurrentMember,
  isPlatformAdmin, getOrgSubscriptionPlan, getOrganization,
} from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import ConfirmDialog from "@/components/ConfirmDialog";

const STATUS_LABELS: Record<ProjectStatus, string> = {
  active: "En cours",
  paused: "En pause",
  done: "Terminé",
};

const STATUS_COLORS: Record<ProjectStatus, { dot: string; badge: string; border: string }> = {
  active:  { dot: "bg-emerald-400", badge: "text-emerald-400 bg-emerald-400/10", border: "border-l-emerald-400" },
  paused:  { dot: "bg-amber-400",   badge: "text-amber-400 bg-amber-400/10",     border: "border-l-amber-400"   },
  done:    { dot: "bg-gray-500",    badge: "text-gray-400 bg-gray-400/10",       border: "border-l-gray-600"    },
};

const PLAN_LABELS: Record<string, string> = {
  free: "Gratuit", starter: "Starter", pro: "Pro", enterprise: "Entreprise",
};

const NAV_ITEMS = [
  { label: "Profil",          path: "/profile",      role: null,    adminOnly: false },
  { label: "Équipe",          path: "/team",         role: "owner", adminOnly: false },
  { label: "Champs",          path: "/fields",       role: "owner", adminOnly: false },
  { label: "Statistiques",    path: "/stats",        role: "owner", adminOnly: false },
  { label: "PDF",             path: "/pdf-settings", role: "owner", adminOnly: false },
  { label: "Mes stats",       path: "/my-stats",     role: null,    adminOnly: false },
  { label: "Abonnement",      path: "/subscription", role: "owner", adminOnly: false },
  { label: "Administration",  path: "/admin",        role: null,    adminOnly: true  },
];

const ROLE_LABELS: Record<string, string> = {
  owner: "Patron", manager: "Chef de chantier", worker: "Ouvrier",
};

export default function Home() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ProjectStatus | "all">("all");
  const [name, setName] = useState("");
  const [clientName, setClientName] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [currentMember, setCurrentMember] = useState<OrganizationMember | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showNav, setShowNav] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [org, setOrg] = useState<Organization | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    Promise.all([
      getProjects(),
      getCurrentMember(),
      isPlatformAdmin(),
      getOrgSubscriptionPlan(),
      getOrganization(),
    ]).then(([data, me, admin, planData, orgData]) => {
      setProjects(data);
      setCurrentMember(me);
      setIsAdmin(admin);
      setPlan(planData);
      setOrg(orgData);
      setLoading(false);
    });
  }, []);

  async function handleAddProject() {
    if (!name.trim() || !clientName.trim()) return;
    const partial: NewProject = {
      id: crypto.randomUUID(),
      name,
      clientName,
      status: "active",
      createdAt: new Date().toISOString(),
    };
    const toastId = toast.loading("Création du chantier...");
    const created = await addProject(partial as Project);
    if (created) {
      setProjects(prev => [created, ...prev]);
      toast.success("Chantier créé", { id: toastId });
    } else {
      toast.error("Erreur lors de la création", { id: toastId });
    }
    setName("");
    setClientName("");
    setShowForm(false);
  }

  async function handleDelete(id: string) {
    const name = projects.find(p => p.id === id)?.name ?? "ce chantier";
    await deleteProject(id);
    setProjects(prev => prev.filter(p => p.id !== id));
    setConfirmDeleteId(null);
    toast.success(`"${name}" supprimé`);
  }

  const filtered = projects
    .filter(p => filter === "all" || p.status === filter)
    .filter(p => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.clientName.toLowerCase().includes(q);
    });
  const counts = {
    all: projects.length,
    active: projects.filter(p => p.status === "active").length,
    paused: projects.filter(p => p.status === "paused").length,
    done: projects.filter(p => p.status === "done").length,
  };

  // Limite projets selon le plan
  const projectLimit = plan?.maxProjects ?? 3;
  const projectLimitReached = projectLimit !== -1 && projects.length >= projectLimit;

  // Bannière essai : afficher si trial et ≤ 5 jours restants
  const trialDaysLeft = (() => {
    if (org?.subscriptionStatus !== "trial" || !org.trialEndsAt) return null;
    const days = Math.ceil((new Date(org.trialEndsAt).getTime() - Date.now()) / 86400000);
    return days;
  })();
  const showTrialBanner = trialDaysLeft !== null && trialDaysLeft <= 5 && currentMember?.role === "owner";

  const visibleNavItems = NAV_ITEMS.filter(item => {
    if (item.adminOnly) return isAdmin;
    if (item.role) return item.role === currentMember?.role;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-gray-100">

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/5 bg-[#0a0a0b]/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center text-sm">🔨</div>
            <span className="font-semibold text-white tracking-tight">ChantierLog</span>
            {currentMember && (
              <span className="hidden sm:inline text-xs text-gray-600 border border-white/5 rounded-full px-2 py-0.5">
                {currentMember.name} · {ROLE_LABELS[currentMember.role]}
                {plan && currentMember.role === "owner" && (
                  <> · <span className="text-orange-400/70">{PLAN_LABELS[plan.name] ?? plan.label}</span></>
                )}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {currentMember?.role !== "worker" && (
              <button
                onClick={() => {
                  if (projectLimitReached) {
                    router.push("/subscription");
                  } else {
                    setShowForm(!showForm);
                  }
                }}
                title={projectLimitReached ? `Limite de ${projectLimit} projets atteinte` : undefined}
                className={`h-9 px-4 text-white text-xs font-semibold rounded-lg transition-all duration-150 shadow-lg focus:outline-none focus:ring-2 focus:ring-orange-500/50 ${
                  projectLimitReached
                    ? "bg-gray-600 hover:bg-gray-500 shadow-none cursor-pointer"
                    : "bg-orange-500 hover:bg-orange-400 active:bg-orange-600 shadow-orange-500/20"
                }`}
              >
                {projectLimitReached ? "Limite atteinte" : "+ Nouveau chantier"}
              </button>
            )}

            {/* Nav dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowNav(!showNav)}
                className="h-9 w-9 rounded-lg border border-white/10 hover:border-white/20 flex items-center justify-center text-gray-400 hover:text-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500/40"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="2" cy="7" r="1.5" fill="currentColor"/>
                  <circle cx="7" cy="7" r="1.5" fill="currentColor"/>
                  <circle cx="12" cy="7" r="1.5" fill="currentColor"/>
                </svg>
              </button>
              {showNav && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowNav(false)} />
                  <div className="absolute right-0 top-10 z-20 w-52 bg-[#111113] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
                    {visibleNavItems.filter(i => !i.adminOnly).map(item => (
                      <button
                        key={item.path}
                        onClick={() => { router.push(item.path); setShowNav(false); }}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors flex items-center justify-between"
                      >
                        <span>{item.label}</span>
                        {item.path === "/subscription" && plan && (
                          <span className="text-xs text-orange-400/70">{PLAN_LABELS[plan.name] ?? plan.label}</span>
                        )}
                      </button>
                    ))}

                    {/* Séparateur + lien admin si applicable */}
                    {isAdmin && (
                      <>
                        <div className="border-t border-white/5 mx-3 my-1" />
                        <button
                          onClick={() => { router.push("/admin"); setShowNav(false); }}
                          className="w-full text-left px-4 py-2.5 text-sm text-orange-400 hover:text-orange-300 hover:bg-orange-500/5 transition-colors flex items-center gap-2"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                          Administration
                        </button>
                      </>
                    )}

                    <div className="border-t border-white/5" />
                    <button
                      onClick={async () => { await supabase.auth.signOut(); router.push("/login"); }}
                      className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-white/5 transition-colors"
                    >
                      Déconnexion
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Bannière essai expirant */}
      {showTrialBanner && (
        <div className="bg-orange-500/10 border-b border-orange-500/20">
          <div className="max-w-5xl mx-auto px-5 py-2.5 flex items-center justify-between gap-4">
            <p className="text-sm text-orange-300">
              {trialDaysLeft === 0
                ? "⚠️ Votre période d'essai se termine aujourd'hui."
                : `⏳ Votre période d'essai se termine dans ${trialDaysLeft} jour${trialDaysLeft > 1 ? "s" : ""}.`}
            </p>
            <button
              onClick={() => router.push("/subscription")}
              className="text-xs font-semibold text-orange-400 hover:text-orange-300 border border-orange-500/30 rounded-lg px-3 py-1.5 transition-colors flex-shrink-0"
            >
              Voir les plans →
            </button>
          </div>
        </div>
      )}

      {/* Formulaire nouveau chantier */}
      {showForm && currentMember?.role !== "worker" && !projectLimitReached && (
        <div className="border-b border-white/5 bg-[#0e0e10]">
          <div className="max-w-5xl mx-auto px-5 py-5 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Nouveau chantier</p>
            <div className="grid grid-cols-2 gap-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nom du chantier"
                className="col-span-2 sm:col-span-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/30 focus:bg-white/[0.07] transition-all"
              />
              <input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Nom du client"
                onKeyDown={(e) => e.key === "Enter" && handleAddProject()}
                className="col-span-2 sm:col-span-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/30 focus:bg-white/[0.07] transition-all"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddProject}
                className="px-5 py-2.5 bg-orange-500 hover:bg-orange-400 active:bg-orange-600 text-white text-sm font-semibold rounded-lg transition-all shadow-lg shadow-orange-500/20 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              >
                Créer le chantier
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-gray-400 text-sm font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-white/20"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-5 py-8 space-y-6">

        {/* Stats rapides */}
        {!loading && projects.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total",    value: counts.all,    color: "text-white"       },
              { label: "En cours", value: counts.active,  color: "text-emerald-400" },
              { label: "En pause", value: counts.paused,  color: "text-amber-400"   },
              { label: "Terminés", value: counts.done,    color: "text-gray-500"    },
            ].map(s => (
              <div key={s.label} className="bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-600 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Alerte limite projets atteinte */}
        {projectLimitReached && currentMember?.role !== "worker" && (
          <div className="flex items-center justify-between gap-4 bg-white/[0.03] border border-white/10 rounded-xl px-5 py-3.5">
            <p className="text-sm text-gray-400">
              Limite de <span className="text-white font-medium">{projectLimit} projets</span> atteinte sur votre plan {plan?.label}.
            </p>
            <button
              onClick={() => router.push("/subscription")}
              className="text-xs font-semibold text-orange-400 hover:text-orange-300 border border-orange-500/30 rounded-lg px-3 py-1.5 transition-colors flex-shrink-0"
            >
              Passer au Pro →
            </button>
          </div>
        )}

        {/* Filtres + recherche */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex gap-1 bg-white/[0.03] border border-white/5 rounded-xl p-1 w-fit">
            {(["all", "active", "paused", "done"] as const).map(s => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-orange-500/40 ${
                  filter === s
                    ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {s === "all" ? "Tous" : STATUS_LABELS[s]}
              </button>
            ))}
          </div>
          {projects.length > 3 && (
            <div className="relative flex-1 max-w-xs">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 w-3.5 h-3.5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
              </svg>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher..."
                className="w-full pl-9 pr-4 py-1.5 bg-white/[0.03] border border-white/5 rounded-xl text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:border-orange-500/30 transition-colors"
              />
            </div>
          )}
        </div>

        {/* Liste */}
        <div className="space-y-2">
          {loading && (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white/[0.03] border border-white/5 rounded-xl px-5 py-4 animate-pulse">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-white/10 flex-shrink-0" />
                    <div className="h-4 bg-white/10 rounded w-1/3" />
                    <div className="h-4 bg-white/10 rounded w-16" />
                  </div>
                  <div className="h-3 bg-white/5 rounded w-1/4 ml-4" />
                </div>
              ))}
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="text-center py-16 space-y-4">
              <p className="text-4xl">🏗️</p>
              {search ? (
                <>
                  <p className="text-gray-500 text-sm">Aucun résultat pour « {search} »</p>
                  <button onClick={() => setSearch("")} className="text-xs text-orange-400 hover:text-orange-300 border border-orange-500/20 rounded-lg px-4 py-2 transition-colors">
                    Effacer la recherche
                  </button>
                </>
              ) : (
                <>
                  <p className="text-gray-500 text-sm font-medium">
                    {currentMember?.role === "worker"
                      ? "Aucun chantier assigné pour l'instant."
                      : filter !== "all"
                        ? `Aucun chantier « ${STATUS_LABELS[filter]} ».`
                        : "Commencez par créer votre premier chantier."}
                  </p>
                  {currentMember?.role !== "worker" && filter === "all" && !projectLimitReached && (
                    <button
                      onClick={() => setShowForm(true)}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold rounded-xl transition-colors shadow-lg shadow-orange-500/20"
                    >
                      + Nouveau chantier
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {filtered.map((project) => {
            const s = STATUS_COLORS[project.status];
            return (
              <div
                key={project.id}
                onClick={() => router.push(`/project/${project.id}`)}
                className={`group relative bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 border-l-2 ${s.border} rounded-xl px-5 py-4 cursor-pointer transition-all duration-150`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${s.dot} flex-shrink-0`} />
                      <p className="font-semibold text-gray-100 truncate">{project.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${s.badge} flex-shrink-0`}>
                        {STATUS_LABELS[project.status]}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 ml-4.5 text-xs text-gray-600">
                      <span>{project.clientName}</span>
                      {project.city && <><span>·</span><span>{project.city}</span></>}
                      {project.startDate && (
                        <><span>·</span><span>Début {new Date(project.startDate).toLocaleDateString("fr-FR")}</span></>
                      )}
                    </div>
                    {project.description && (
                      <p className="ml-4.5 text-xs text-gray-700 mt-1 truncate">{project.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-4 ml-4 flex-shrink-0">
                    <span className="text-gray-700 group-hover:text-orange-400 transition-colors text-lg">→</span>
                    {currentMember?.role !== "worker" && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(project.id); }}
                        className="text-xs text-gray-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        Supprimer
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {confirmDeleteId && (
        <ConfirmDialog
          message={`Supprimer "${projects.find(p => p.id === confirmDeleteId)?.name}" ? Cette action est irréversible.`}
          onConfirm={() => handleDelete(confirmDeleteId)}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </div>
  );
}
