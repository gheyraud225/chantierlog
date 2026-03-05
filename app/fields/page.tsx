"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FieldTemplate, FieldType } from "@/lib/types";
import { getFieldTemplates, addFieldTemplate, deleteFieldTemplate } from "@/lib/storage";

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: "Texte",
  number: "Nombre",
  boolean: "Oui / Non",
};

export default function FieldsPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<FieldTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState("");
  const [fieldType, setFieldType] = useState<FieldType>("text");
  const [category, setCategory] = useState("");

  useEffect(() => {
    getFieldTemplates().then(data => {
      setTemplates(data);
      setLoading(false);
    });
  }, []);

  async function handleAdd() {
    if (!label.trim()) return;
    const created = await addFieldTemplate(label, fieldType, category);
    if (created) {
      setTemplates(prev => [...prev, created]);
      setLabel("");
      setFieldType("text");
      setCategory("");
    }
  }

  async function handleDelete(id: string) {
    await deleteFieldTemplate(id);
    setTemplates(prev => prev.filter(t => t.id !== id));
  }

  // Grouper par catégorie
  const grouped = templates.reduce<Record<string, FieldTemplate[]>>((acc, t) => {
    const key = t.category || "Sans catégorie";
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => router.push("/")}
          className="text-gray-500 hover:text-gray-300 transition-colors text-sm"
        >
          ← Retour
        </button>
        <div>
          <h1 className="text-xl font-bold text-orange-400">Champs personnalisés</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Bibliothèque de champs disponibles pour vos chantiers
          </p>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">

        {/* Formulaire */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
            Nouveau champ
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Label (ex: Surface traitée)"
              className="col-span-2 w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
            />
            <select
              value={fieldType}
              onChange={(e) => setFieldType(e.target.value as FieldType)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-100 focus:outline-none focus:border-orange-500 transition-colors"
            >
              <option value="text">Texte</option>
              <option value="number">Nombre</option>
              <option value="boolean">Oui / Non</option>
            </select>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Catégorie (ex: Peinture)"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>
          <button
            onClick={handleAdd}
            className="w-full bg-orange-500 hover:bg-orange-400 text-white font-semibold py-3 rounded-lg transition-colors text-sm"
          >
            Ajouter le champ
          </button>
        </section>

        {/* Liste groupée par catégorie */}
        {loading && (
          <div className="text-center py-12 text-gray-600 text-sm">Chargement...</div>
        )}

        {!loading && templates.length === 0 && (
          <div className="text-center py-12 text-gray-600 text-sm">
            Aucun champ pour linstant. Créez votre bibliothèque ci-dessus.
          </div>
        )}

        {Object.entries(grouped).map(([cat, fields]) => (
          <section key={cat} className="space-y-2">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              {cat}
            </h2>
            {fields.map(field => (
              <div
                key={field.id}
                className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4 flex items-center justify-between"
              >
                <div>
                  <p className="font-semibold text-gray-100 text-sm">{field.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {FIELD_TYPE_LABELS[field.fieldType]}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(field.id)}
                  className="text-xs text-gray-600 hover:text-red-400 transition-colors"
                >
                  Supprimer
                </button>
              </div>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}