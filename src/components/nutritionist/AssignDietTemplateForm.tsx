"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveDietPlan } from "@/app/actions/diet";
import type { DietTemplateRow } from "@/app/actions/diet-templates";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface AssignDietTemplateFormProps {
  patientId: string;
  templates: DietTemplateRow[];
}

export function AssignDietTemplateForm({
  patientId,
  templates,
}: AssignDietTemplateFormProps) {
  const router = useRouter();
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleAssign() {
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;
    setSaving(true);
    setMessage(null);
    try {
      await saveDietPlan({
        patientId,
        title: template.title,
        rawText: template.raw_text ?? "",
      });
      setMessage("Dieta asignada al paciente.");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Error al asignar");
    } finally {
      setSaving(false);
    }
  }

  if (templates.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        Aún no hay plantillas en tu biblioteca. Créalas en Dietas o pega una dieta
        puntual abajo.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="diet-template">Plantilla</Label>
        <select
          id="diet-template"
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
          className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </select>
      </div>
      <Button
        type="button"
        onClick={() => void handleAssign()}
        disabled={saving || !templateId}
      >
        {saving ? "Asignando…" : "Asignar"}
      </Button>
      {message && <p className="text-sm text-emerald-700">{message}</p>}
    </div>
  );
}
