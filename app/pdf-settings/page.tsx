"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PdfSettings } from "@/lib/types";
import { getPdfSettings, updatePdfSettings } from "@/lib/storage";

const PRESET_COLORS = [
  { label: "Orange", value: "#F0A500" },
  { label: "Bleu", value: "#3B82F6" },
  { label: "Vert", value: "#22C55E" },
  { label: "Rouge", value: "#EF4444" },
  { label: "Violet", value: "#8B5CF6" },
  { label: "Gris", value: "#6B7280" },
  { label: "Noir", value: "#1F2937" },
];

export default function PdfSettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<PdfSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getPdfSettings().then(data => {
      setSettings(data);
      setLoading(false);
    });
  }, []);

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    await updatePdfSettings(settings);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setSettings(prev => prev ? { ...prev, logoBase64: ev.target?.result as string } : prev);
    };
    reader.readAsDataURL(file);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center">
        <p className="text-gray-600 text-sm">Chargement...</p>
      </div>
    );
  }

  if (!settings) return null;

  const colorRgb = settings.primaryColor;

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
            <h1 className="text-xl font-bold text-orange-400">Paramètres PDF</h1>
            <p className="text-xs text-gray-500 mt-0.5">Personnalisez vos rapports</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          {saved ? "✓ Sauvegardé" : saving ? "..." : "Sauvegarder"}
        </button>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">

        {/* Aperçu */}
        <section
          className="rounded-xl overflow-hidden border border-gray-800"
          style={{ borderTopColor: colorRgb, borderTopWidth: 4 }}
        >
          <div className="px-6 py-4" style={{ backgroundColor: colorRgb }}>
            <div className="flex items-center gap-3">
              {settings.logoBase64 ? (
                <img src={settings.logoBase64} alt="logo" className="h-8 w-8 object-contain rounded" />
              ) : (
                <span className="text-2xl">🔨</span>
              )}
              <span className="text-white font-bold text-lg">ChantierLog</span>
            </div>
          </div>
          <div className="bg-gray-900 px-6 py-4">
            <p className="text-gray-100 font-bold text-lg">Nom du chantier</p>
            <p className="text-gray-500 text-xs mt-1">Client · Adresse</p>
            <p className="text-gray-600 text-xs mt-3">{settings.footerText}</p>
          </div>
        </section>

        {/* Couleur */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
            Couleur principale
          </h2>
          <div className="flex gap-3 flex-wrap">
            {PRESET_COLORS.map(({ label, value }) => (
              <button
                key={value}
                onClick={() => setSettings(prev => prev ? { ...prev, primaryColor: value } : prev)}
                className={`w-10 h-10 rounded-lg border-2 transition-all ${
                  settings.primaryColor === value
                    ? "border-white scale-110"
                    : "border-transparent hover:border-gray-500"
                }`}
                style={{ backgroundColor: value }}
                title={label}
              />
            ))}
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={settings.primaryColor}
                onChange={(e) => setSettings(prev => prev ? { ...prev, primaryColor: e.target.value } : prev)}
                className="w-10 h-10 rounded-lg border-2 border-gray-700 cursor-pointer bg-gray-800"
                title="Couleur personnalisée"
              />
              <span className="text-xs text-gray-500">Personnalisee</span>
            </div>
          </div>
        </section>

        {/* Logo */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
            Logo de lentreprise
          </h2>
          <div className="flex items-center gap-4">
            {settings.logoBase64 ? (
              <div className="relative">
                <img
                  src={settings.logoBase64}
                  alt="logo"
                  className="h-16 w-16 object-contain rounded-lg border border-gray-700 bg-gray-800"
                />
                <button
                  onClick={() => setSettings(prev => prev ? { ...prev, logoBase64: "" } : prev)}
                  className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-xs flex items-center justify-center"
                >
                  ×
                </button>
              </div>
            ) : (
              <div className="h-16 w-16 rounded-lg border border-gray-700 bg-gray-800 flex items-center justify-center">
                <span className="text-gray-600 text-xs">Aucun</span>
              </div>
            )}
            <div>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="block text-sm text-gray-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-gray-700 file:text-gray-300 file:text-sm hover:file:bg-gray-600 cursor-pointer"
              />
              <p className="text-xs text-gray-600 mt-1">PNG ou JPG recommandé, fond transparent idéal</p>
            </div>
          </div>
        </section>

        {/* Sections */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
            Sections affichées
          </h2>
          <div className="space-y-3">
            {[
              { key: "showCover", label: "Page de garde", description: "Première page avec le nom du chantier et les infos client" },
              { key: "showPhotos", label: "Photos", description: "Afficher les photos dans les notes" },
              { key: "showCustomFields", label: "Champs personnalisés", description: "Afficher les champs métier dans les notes" },
            ].map(({ key, label, description }) => (
              <div key={key} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                <div>
                  <p className="text-sm font-semibold text-gray-100">{label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{description}</p>
                </div>
                <button
                  onClick={() => setSettings(prev => prev ? {
                    ...prev,
                    [key]: !prev[key as keyof PdfSettings]
                  } : prev)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    settings[key as keyof PdfSettings]
                      ? "bg-orange-500"
                      : "bg-gray-700"
                  }`}
                  style={{ backgroundColor: settings[key as keyof PdfSettings] ? colorRgb : undefined }}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      settings[key as keyof PdfSettings] ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Footer text */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
            Texte de pied de page
          </h2>
          <input
            value={settings.footerText}
            onChange={(e) => setSettings(prev => prev ? { ...prev, footerText: e.target.value } : prev)}
            placeholder="Document confidentiel — généré automatiquement"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
          />
        </section>

      </div>
    </div>
  );
}