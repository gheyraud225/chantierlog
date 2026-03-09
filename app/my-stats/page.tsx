"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getPersonalStats, PersonalStatsData, getCurrentMember } from "@/lib/storage";
import { OrganizationMember } from "@/lib/types";

export default function MyStatsPage() {
  const router = useRouter();
  const [stats, setStats] = useState<PersonalStatsData | null>(null);
  const [member, setMember] = useState<OrganizationMember | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getPersonalStats(), getCurrentMember()]).then(([s, me]) => {
      setStats(s);
      setMember(me);
      setLoading(false);
    });
  }, []);

  const maxActivity = stats ? Math.max(...stats.activityByDay.map(d => d.count), 1) : 1;
  const skipEvery = 5;

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-gray-100">
      <header className="sticky top-0 z-30 border-b border-white/5 bg-[#0a0a0b]/80 backdrop-blur-xl">
        <div className="max-w-2xl mx-auto px-5 h-14 flex items-center gap-4">
          <button onClick={() => router.push("/")} className="text-gray-600 hover:text-gray-300 transition-colors text-sm">←</button>
          <div>
            <h1 className="font-semibold text-white">Mes statistiques</h1>
            <p className="text-xs text-gray-600">{member?.name}</p>
          </div>
        </div>
      </header>

      {loading && (
        <div className="flex items-center justify-center py-32">
          <p className="text-gray-700 text-sm">Chargement...</p>
        </div>
      )}

      {!loading && stats && (
        <div className="max-w-2xl mx-auto px-5 py-8 space-y-6">

          {/* KPIs */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Notes écrites",  value: stats.totalLogs,     color: "text-orange-400" },
              { label: "Photos ajoutées", value: stats.totalPhotos,   color: "text-blue-400"   },
              { label: "Chantiers",       value: stats.totalProjects,  color: "text-emerald-400"},
            ].map(kpi => (
              <div key={kpi.label} className="bg-white/[0.03] border border-white/5 rounded-2xl px-4 py-4">
                <p className={`text-3xl font-bold ${kpi.color}`}>{kpi.value}</p>
                <p className="text-xs text-gray-600 mt-1">{kpi.label}</p>
              </div>
            ))}
          </div>

          {/* Insights */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/[0.03] border border-white/5 rounded-2xl px-5 py-4 space-y-1">
              <p className="text-xs text-gray-600 uppercase tracking-widest">Jour le plus actif</p>
              <p className="text-xl font-bold text-white">{stats.mostActiveDay}</p>
            </div>
            <div className="bg-white/[0.03] border border-white/5 rounded-2xl px-5 py-4 space-y-1">
              <p className="text-xs text-gray-600 uppercase tracking-widest">Commune principale</p>
              <p className="text-xl font-bold text-white truncate">{stats.mostActiveCommune ?? "—"}</p>
            </div>
            {stats.lastLogDate && (
              <div className="col-span-2 bg-white/[0.03] border border-white/5 rounded-2xl px-5 py-4 space-y-1">
                <p className="text-xs text-gray-600 uppercase tracking-widest">Dernière note</p>
                <p className="text-lg font-semibold text-white">
                  {new Date(stats.lastLogDate).toLocaleDateString("fr-FR", {
                    weekday: "long", day: "numeric", month: "long", year: "numeric"
                  })}
                </p>
              </div>
            )}
          </div>

          {/* ── Utilisation de l'IA ── */}
          {stats.logsWithAI > 0 && (
            <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-widest">
                  Utilisation de l&apos;IA
                </p>
                <span className="text-xs font-semibold text-orange-400">
                  {stats.totalLogs > 0 ? Math.round((stats.logsWithAI / stats.totalLogs) * 100) : 0}% de mes notes
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-2xl font-bold text-orange-400">{stats.logsWithAI}</p>
                  <p className="text-xs text-gray-600 mt-1">Assistées IA</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-violet-400">{stats.logsWithVoice}</p>
                  <p className="text-xs text-gray-600 mt-1">Vocales</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-sky-400">{stats.logsWithAITitle}</p>
                  <p className="text-xs text-gray-600 mt-1">Titres IA</p>
                </div>
              </div>
              <div className="space-y-1">
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-500/70 rounded-full transition-all duration-700"
                    style={{ width: `${stats.totalLogs > 0 ? (stats.logsWithAI / stats.totalLogs) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Activité 30 jours */}
          <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-6 space-y-4">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-widest">
              Activité — 30 derniers jours
            </p>
            <div className="space-y-2">
              <div className="flex items-end gap-0.5 h-24">
                {stats.activityByDay.map(({ date, count }) => {
                  const height = count === 0 ? 2 : Math.max(6, (count / maxActivity) * 96);
                  const isToday = date === new Date().toISOString().slice(0, 10);
                  return (
                    <div key={date} className="flex-1 group relative">
                      <div
                        className={`w-full rounded-sm transition-all ${
                          count === 0 ? "bg-white/5"
                          : isToday ? "bg-orange-400"
                          : "bg-orange-500/50 group-hover:bg-orange-400"
                        }`}
                        style={{ height: `${height}px` }}
                      />
                      <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block z-10 pointer-events-none">
                        <div className="bg-gray-800 border border-white/10 text-white text-xs rounded-lg px-2 py-1 whitespace-nowrap">
                          {new Date(date).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} · {count} note{count > 1 ? "s" : ""}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-0.5">
                {stats.activityByDay.map(({ date, label }, i) => (
                  <div key={date} className="flex-1 text-center">
                    {i % skipEvery === 0 && (
                      <span className="text-gray-700 text-xs">{label}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Chantiers les plus actifs */}
          {stats.logsByProject.length > 0 && (
            <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-6 space-y-4">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-widest">
                Mes chantiers
              </p>
              <div className="space-y-3">
                {stats.logsByProject.map(({ name, count }, i) => {
                  const max = stats.logsByProject[0].count;
                  return (
                    <div key={name} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-700 font-mono w-4">{i + 1}</span>
                          <span className="text-gray-300 font-medium truncate">{name}</span>
                        </div>
                        <span className="text-gray-600 flex-shrink-0 ml-2">
                          {count} note{count > 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-orange-500/60 rounded-full transition-all duration-700"
                          style={{ width: `${(count / max) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {stats.totalLogs === 0 && (
            <div className="text-center py-12 space-y-2">
              <p className="text-3xl">📋</p>
              <p className="text-gray-600 text-sm">Aucune note pour linstant.</p>
            </div>
          )}

        </div>
      )}
    </div>
  );
}