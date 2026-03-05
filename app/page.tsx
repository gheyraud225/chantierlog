"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Project, ProjectStatus, OrganizationMember, NewProject } from "@/lib/types";
import { getProjects, addProject, deleteProject, getCurrentMember } from "@/lib/storage";
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

const NAV_ITEMS = [
  { label: "Profil",        path: "/profile",       role: null },
  { label: "Équipe",        path: "/team",          role: "owner" },
  { label: "Champs",        path: "/fields",        role: "owner" },
  { label: "Statistiques",  path: "/stats",         role: "owner" },
  { label: "PDF",           path: "/pdf-settings",  role: "owner" },
  { label: "Mes stats", path: "/my-stats", role: null },
];

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

  useEffect(() => {
    Promise.all([getProjects(), getCurrentMember()]).then(([data, me]) => {
      setProjects(data);
      setCurrentMember(me);
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
    const created = await addProject(partial as Project);
    if (created) setProjects(prev => [created, ...prev]);
    setName("");
    setClientName("");
    setShowForm(false);
  }

  async function handleDelete(id: string) {
    await deleteProject(id);
    setProjects(prev => prev.filter(p => p.id !== id));
    setConfirmDeleteId(null);
  }

  const filtered = filter === "all" ? projects : projects.filter(p => p.status === filter);
  const counts = {
    all: projects.length,
    active: projects.filter(p => p.status === "active").length,
    paused: projects.filter(p => p.status === "paused").length,
    done: projects.filter(p => p.status === "done").length,
  };

  const ROLE_LABELS: Record<string, string> = {
    owner: "Patron", manager: "Chef de chantier", worker: "Ouvrier",
  };

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
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {currentMember?.role !== "worker" && (
              <button
                onClick={() => setShowForm(!showForm)}
                className="h-8 px-3 bg-orange-500 hover:bg-orange-400 text-white text-xs font-semibold rounded-lg transition-all duration-150 shadow-lg shadow-orange-500/20"
              >
                + Nouveau chantier
              </button>
            )}

            {/* Nav dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowNav(!showNav)}
                className="h-8 w-8 rounded-lg border border-white/10 hover:border-white/20 flex items-center justify-center text-gray-400 hover:text-gray-200 transition-colors"
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
                  <div className="absolute right-0 top-10 z-20 w-44 bg-[#111113] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
                    {NAV_ITEMS.filter(item => !item.role || item.role === currentMember?.role).map(item => (
                      <button
                        key={item.path}
                        onClick={() => { router.push(item.path); setShowNav(false); }}
                        className="w-full text-left px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                      >
                        {item.label}
                      </button>
                    ))}
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

      {/* Formulaire */}
      {showForm && currentMember?.role !== "worker" && (
        <div className="border-b border-white/5 bg-[#0e0e10]">
          <div className="max-w-5xl mx-auto px-5 py-5 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Nouveau chantier</p>
            <div className="grid grid-cols-2 gap-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nom du chantier"
                className="col-span-2 sm:col-span-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-orange-500/50 focus:bg-white/[0.07] transition-all"
              />
              <input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Nom du client"
                onKeyDown={(e) => e.key === "Enter" && handleAddProject()}
                className="col-span-2 sm:col-span-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:border-orange-500/50 focus:bg-white/[0.07] transition-all"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddProject}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold rounded-lg transition-colors shadow-lg shadow-orange-500/20"
              >
                Créer
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-400 text-sm font-semibold rounded-lg transition-colors"
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
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Total",     value: counts.all,    color: "text-white"        },
              { label: "En cours",  value: counts.active,  color: "text-emerald-400"  },
              { label: "En pause",  value: counts.paused,  color: "text-amber-400"    },
              { label: "Terminés",  value: counts.done,    color: "text-gray-500"     },
            ].map(s => (
              <div key={s.label} className="bg-white/[0.03] border border-white/5 rounded-xl px-4 py-3">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-600 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filtres */}
        <div className="flex gap-1 bg-white/[0.03] border border-white/5 rounded-xl p-1 w-fit">
          {(["all", "active", "paused", "done"] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                filter === s
                  ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {s === "all" ? "Tous" : STATUS_LABELS[s]}
            </button>
          ))}
        </div>

        {/* Liste */}
        <div className="space-y-2">
          {loading && (
            <div className="text-center py-16 text-gray-700 text-sm">Chargement...</div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="text-center py-16 space-y-2">
              <p className="text-3xl">🏗️</p>
              <p className="text-gray-600 text-sm">
                {currentMember?.role === "worker"
                  ? "Aucun chantier assigné pour l'instant."
                  : "Aucun chantier. Créez-en un pour commencer."}
              </p>
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