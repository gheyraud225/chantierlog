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
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/")}
            className="text-gray-500 hover:text-gray-300 transition-colors text-sm"
          >
            ← Retour
          </button>
          <div>
            <h1 className="text-xl font-bold text-orange-400">Statistiques</h1>
            <p className="text-xs text-gray-500 mt-0.5">Vue densemble de votre activité</p>
          </div>
        </div>
        {stats && (
          <button
            onClick={() => exportCSV(stats, period)}
            className="text-xs text-gray-500 hover:text-gray-300 border border-gray-700 hover:border-gray-500 px-3 py-2 rounded-lg transition-colors"
          >
            Exporter CSV
          </button>
        )}
      </header>

      {loading && (
        <div className="flex items-center justify-center py-32">
          <p className="text-gray-600 text-sm">Chargement...</p>
        </div>
      )}

      {!loading && stats && (
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">

          {/* KPIs */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "Chantiers", value: stats.totalProjects, color: "text-orange-400" },
              { label: "Notes totales", value: stats.totalLogs, color: "text-blue-400" },
              { label: "Membres", value: stats.totalMembers, color: "text-green-400" },
              { label: "Terminés", value: stats.projectsByStatus.done, color: "text-gray-400" },
            ].map(kpi => (
              <div key={kpi.label} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <p className={`text-3xl font-bold ${kpi.color}`}>{kpi.value}</p>
                <p className="text-xs text-gray-500 mt-1">{kpi.label}</p>
              </div>
            ))}
          </div>

          {/* Statuts */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              Répartition des chantiers
            </h2>
            <div className="space-y-3">
              {[
                { key: "active", label: "En cours", color: "bg-green-400" },
                { key: "paused", label: "En pause", color: "bg-yellow-400" },
                { key: "done", label: "Terminés", color: "bg-gray-500" },
              ].map(({ key, label, color }) => {
                const count = stats.projectsByStatus[key] ?? 0;
                const pct = stats.totalProjects > 0 ? (count / stats.totalProjects) * 100 : 0;
                return (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">{label}</span>
                      <span className="text-gray-500">{count} chantier{count > 1 ? "s" : ""}</span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
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
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                Activité
              </h2>
              <div className="flex gap-1">
                {(["week", "month", "year"] as StatsPeriod[]).map(p => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      period === p
                        ? "bg-orange-500 text-white"
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
              <div className="flex items-end gap-0.5 h-32">
                {stats.activityByDay.map(({ date, count, label }, i) => {
                  const height = count === 0 ? 2 : Math.max(6, (count / maxActivity) * 128);
                  const isToday = date === new Date().toISOString().slice(0, 10);
                  return (
                    <div key={date} className="flex-1 flex flex-col items-center group relative">
                      <div
                        className={`w-full rounded-sm transition-all ${
                          count === 0
                            ? "bg-gray-800"
                            : isToday
                            ? "bg-orange-400"
                            : "bg-orange-500/60 group-hover:bg-orange-400"
                        }`}
                        style={{ height: `${height}px` }}
                      />
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block z-10 pointer-events-none">
                        <div className="bg-gray-700 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
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
                      <span className="text-gray-600 text-xs">{label}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs text-gray-600">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm bg-orange-400 inline-block" /> Aujourdhui
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm bg-orange-500/60 inline-block" /> Autre jour
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">

            {/* Par employé */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                Activité par employé
              </h2>
              {stats.logsByAuthor.length === 0 && (
                <p className="text-xs text-gray-600 text-center py-4">Aucune note pour linstant.</p>
              )}
              <div className="space-y-3">
                {stats.logsByAuthor.slice(0, 6).map(({ name, count, projects }) => (
                  <div key={name} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-300 font-medium truncate">{name}</span>
                      <span className="text-gray-500 flex-shrink-0 ml-2">
                        {count} note{count > 1 ? "s" : ""} · {projects} chantier{projects > 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
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
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                Activité par commune
              </h2>
              {stats.projectsByCommune.length === 0 && (
                <p className="text-xs text-gray-600 text-center py-4">
                  Ajoutez des communes à vos chantiers.
                </p>
              )}
              <div className="space-y-3">
                {stats.projectsByCommune.map(({ commune, count }) => (
                  <div key={commune} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-300 font-medium">{commune}</span>
                      <span className="text-gray-500">{count} chantier{count > 1 ? "s" : ""}</span>
                    </div>
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
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
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4 sm:col-span-2">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                Chantiers les plus actifs
              </h2>
              {stats.mostActiveProjects.length === 0 && (
                <p className="text-xs text-gray-600 text-center py-4">Aucune note pour linstant.</p>
              )}
              <div className="space-y-3">
                {stats.mostActiveProjects.map(({ name, count }, i) => (
                  <div key={name} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600 font-mono w-4">{i + 1}</span>
                        <span className="text-gray-300 font-medium truncate">{name}</span>
                      </div>
                      <span className="text-gray-500 flex-shrink-0 ml-2">
                        {count} note{count > 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-400 rounded-full transition-all duration-700"
                        style={{ width: `${(count / maxProject) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {!loading && !stats && (
        <div className="flex items-center justify-center py-32">
          <p className="text-gray-600 text-sm">Accès réservé au patron.</p>
        </div>
      )}
    </div>
  );
}