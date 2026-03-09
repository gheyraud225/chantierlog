"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getStats, StatsData, StatsPeriod } from "@/lib/storage";

function exportCSV(stats: StatsData, period: StatsPeriod) {
  const rows: string[][] = [];

  rows.push(["=== ACTIVITÉ PAR JOUR ==="]);
  rows.push(["Date", "Notes"]);
  stats.activityByDay.forEach(({ date, count }) => rows.push([date, String(count)]));

  rows.push([]);
  rows.push(["=== ACTIVITÉ PAR EMPLOYÉ ==="]);
  rows.push(["Nom", "Notes", "Chantiers"]);
  stats.logsByAuthor.forEach(({ name, count, projects }) =>
    rows.push([name, String(count), String(projects)])
  );

  rows.push([]);
  rows.push(["=== PROJETS PAR COMMUNE ==="]);
  rows.push(["Commune", "Chantiers"]);
  stats.projectsByCommune.forEach(({ commune, count }) =>
    rows.push([commune, String(count)])
  );

  rows.push([]);
  rows.push(["=== CHANTIERS LES PLUS ACTIFS ==="]);
  rows.push(["Chantier", "Notes"]);
  stats.mostActiveProjects.forEach(({ name, count }) =>
    rows.push([name, String(count)])
  );

  const csv = rows.map(r => r.join(";")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `chantierlog-stats-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const PERIOD_LABELS: Record<StatsPeriod, string> = {
  week: "7 jours",
  month: "30 jours",
  year: "365 jours",
};

export default function StatsPage() {
  const router = useRouter();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<StatsPeriod>("month");

  useEffect(() => {
    setLoading(true);
    getStats(period).then(data => {
      setStats(data);
      setLoading(false);
    });
  }, [period]);

  const maxActivity = stats ? Math.max(...stats.activityByDay.map(d => d.count), 1) : 1;
  const maxAuthor = stats ? Math.max(...stats.logsByAuthor.map(a => a.count), 1) : 1;
  const maxCommune = stats ? Math.max(...stats.projectsByCommune.map(c => c.count), 1) : 1;
  const maxProject = stats ? Math.max(...stats.mostActiveProjects.map(p => p.count), 1) : 1;

  // Labels axe X — afficher 1 sur N selon période
  const skipEvery = period === "year" ? 1 : period === "month" ? 5 : 1;
  return (
    <div className="min-h-screen bg-[#0a0a0b] text-gray-100">
      <header className="sticky top-0 z-30 border-b border-white/5 bg-[#0a0a0b]/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-5 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => router.push("/")}
              className="h-9 w-9 flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-200 hover:bg-white/5 transition-all flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
              aria-label="Retour"
            >
              ←
            </button>
            <div className="min-w-0">
              <h1 className="font-semibold text-white">Statistiques</h1>
              <p className="text-xs text-gray-600 hidden sm:block">Vue d&apos;ensemble de votre activité</p>
            </div>
          </div>
          {stats && (
            <button
              onClick={() => exportCSV(stats, period)}
              className="h-9 px-3 text-xs text-gray-500 hover:text-gray-300 border border-white/10 hover:border-white/20 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-orange-500/40 flex-shrink-0"
            >
              <span className="hidden sm:inline">Exporter </span>CSV
            </button>
          )}
        </div>
      </header>

      {loading && (
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white/[0.03] border border-white/5 rounded-xl p-5 animate-pulse">
                <div className="h-8 bg-white/10 rounded w-12 mb-2" />
                <div className="h-3 bg-white/5 rounded w-20" />
              </div>
            ))}
          </div>
          <div className="bg-white/[0.03] border border-white/5 rounded-xl p-5 animate-pulse h-40" />
        </div>
      )}

      {!loading && stats && (
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Chantiers", value: stats.totalProjects, color: "text-orange-400" },
              { label: "Notes totales", value: stats.totalLogs, color: "text-blue-400" },
              { label: "Membres", value: stats.totalMembers, color: "text-emerald-400" },
              { label: "Terminés", value: stats.projectsByStatus.done, color: "text-gray-400" },
            ].map(kpi => (
              <div key={kpi.label} className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
                <p className={`text-3xl font-bold ${kpi.color}`}>{kpi.value}</p>
                <p className="text-xs text-gray-600 mt-1">{kpi.label}</p>
              </div>
            ))}
          </div>

          {/* Statuts */}
          <div className="bg-white/[0.03] border border-white/5 rounded-xl p-5 space-y-4">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
              Répartition des chantiers
            </h2>
            <div className="space-y-3">
              {[
                { key: "active", label: "En cours", color: "bg-emerald-400" },
                { key: "paused", label: "En pause", color: "bg-amber-400" },
                { key: "done", label: "Terminés", color: "bg-gray-500" },
              ].map(({ key, label, color }) => {
                const count = stats.projectsByStatus[key] ?? 0;
                const pct = stats.totalProjects > 0 ? (count / stats.totalProjects) * 100 : 0;
                return (
                  <div key={key} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">{label}</span>
                      <span className="text-gray-600">{count} chantier{count > 1 ? "s" : ""}</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${color} rounded-full transition-all duration-700`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Activité */}
          <div className="bg-white/[0.03] border border-white/5 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                Activité
              </h2>
              <div className="flex gap-1 bg-white/[0.03] border border-white/5 rounded-xl p-1">
                {(["week", "month", "year"] as StatsPeriod[]).map(p => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-orange-500/40 ${
                      period === p
                        ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20"
                        : "text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    {PERIOD_LABELS[p]}
                  </button>
                ))}
              </div>
            </div>

            {/* Graphique */}
            <div className="space-y-2">
              <div className="flex items-end gap-0.5 h-24 sm:h-32">
                {stats.activityByDay.map(({ date, count, label }, i) => {
                  const maxH = 96;
                  const height = count === 0 ? 2 : Math.max(6, (count / maxActivity) * maxH);
                  const isToday = date === new Date().toISOString().slice(0, 10);
                  return (
                    <div key={date} className="flex-1 flex flex-col items-center group relative">
                      <div
                        className={`w-full rounded-sm transition-colors duration-200 ${
                          count === 0
                            ? "bg-white/5"
                            : isToday
                            ? "bg-orange-400"
                            : "bg-orange-500/50 group-hover:bg-orange-400"
                        }`}
                        style={{ height: `${height}px` }}
                      />
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                        <div className="bg-[#1a1a1c] border border-white/10 text-white text-xs rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-xl">
                          {new Date(date).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} : {count} note{count > 1 ? "s" : ""}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Axe X */}
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

            <div className="flex items-center gap-4 text-xs text-gray-600">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-orange-400 inline-block" /> Aujourd&apos;hui
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-orange-500/50 inline-block" /> Autre jour
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

            {/* Par employé */}
            <div className="bg-white/[0.03] border border-white/5 rounded-xl p-5 space-y-4">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                Activité par employé
              </h2>
              {stats.logsByAuthor.length === 0 && (
                <p className="text-xs text-gray-600 text-center py-4">Aucune note pour l&apos;instant.</p>
              )}
              <div className="space-y-3">
                {stats.logsByAuthor.slice(0, 6).map(({ name, count, projects }) => (
                  <div key={name} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-300 font-medium truncate">{name}</span>
                      <span className="text-gray-600 flex-shrink-0 ml-2">
                        {count} note{count > 1 ? "s" : ""} · {projects} chantier{projects > 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-400 rounded-full transition-all duration-700"
                        style={{ width: `${(count / maxAuthor) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Par commune */}
            <div className="bg-white/[0.03] border border-white/5 rounded-xl p-5 space-y-4">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                Activité par commune
              </h2>
              {stats.projectsByCommune.length === 0 && (
                <p className="text-xs text-gray-600 text-center py-4">
                  Ajoutez des communes à vos chantiers.
                </p>
              )}
              <div className="space-y-3">
                {stats.projectsByCommune.map(({ commune, count }) => (
                  <div key={commune} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-300 font-medium">{commune}</span>
                      <span className="text-gray-600">{count} chantier{count > 1 ? "s" : ""}</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-400 rounded-full transition-all duration-700"
                        style={{ width: `${(count / maxCommune) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Chantiers les plus actifs */}
            <div className="bg-white/[0.03] border border-white/5 rounded-xl p-5 space-y-4 sm:col-span-2">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                Chantiers les plus actifs
              </h2>
              {stats.mostActiveProjects.length === 0 && (
                <p className="text-xs text-gray-600 text-center py-4">Aucune note pour l&apos;instant.</p>
              )}
              <div className="space-y-3">
                {stats.mostActiveProjects.map(({ name, count }, i) => (
                  <div key={name} className="space-y-1.5">
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
                        className="h-full bg-emerald-400 rounded-full transition-all duration-700"
                        style={{ width: `${(count / maxProject) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* ── Utilisation de l'IA ── */}
          {stats.aiStats.logsWithAI > 0 && (
            <div className="bg-white/[0.03] border border-white/5 rounded-xl p-5 space-y-5">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                  Utilisation de l&apos;IA
                </h2>
                <span className="text-xs font-semibold text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded-full px-2.5 py-1">
                  {stats.aiStats.aiUsageRate}% des notes
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                  <p className="text-2xl font-bold text-orange-400">{stats.aiStats.logsWithAI}</p>
                  <p className="text-xs text-gray-600 mt-1">Assistées IA</p>
                </div>
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                  <p className="text-2xl font-bold text-violet-400">{stats.aiStats.logsWithVoice}</p>
                  <p className="text-xs text-gray-600 mt-1">Transcriptions</p>
                </div>
                <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                  <p className="text-2xl font-bold text-sky-400">{stats.aiStats.logsWithAITitle}</p>
                  <p className="text-xs text-gray-600 mt-1">Titres générés</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Taux d&apos;adoption</span>
                  <span>{stats.aiStats.logsWithAI} / {stats.totalLogs} notes</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-500 rounded-full transition-all duration-700"
                    style={{ width: `${stats.aiStats.aiUsageRate}%` }}
                  />
                </div>
              </div>

              {stats.aiStats.aiByAuthor.length > 0 && (
                <div className="space-y-2 pt-1 border-t border-white/5">
                  <p className="text-xs text-gray-600 pt-1">Par employé</p>
                  {stats.aiStats.aiByAuthor.map(({ name, count }) => {
                    const pct = stats.aiStats.logsWithAI > 0
                      ? Math.round((count / stats.aiStats.logsWithAI) * 100)
                      : 0;
                    return (
                      <div key={name} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-300">{name}</span>
                          <span className="text-gray-600">{count} note{count > 1 ? "s" : ""}</span>
                        </div>
                        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-violet-500/70 rounded-full transition-all duration-700"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {!loading && !stats && (
        <div className="flex flex-col items-center justify-center py-32 gap-3">
          <p className="text-3xl">🔒</p>
          <p className="text-gray-500 text-sm">Accès réservé au patron.</p>
        </div>
      )}
    </div>
  );
}