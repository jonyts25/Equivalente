"use client";

import { useState } from "react";
import Link from "next/link";
import { saveContextualAiDraft } from "@/app/actions/equivalente-ia";
import type { ContextualSaveKind } from "@/lib/ai/contextual-draft";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type SaveableResponse = {
  intencion?: string;
  alimentos_detectados?: string[];
  respuesta_paciente?: string;
  requiere_revision_nutriologa?: boolean;
  motivo_revision?: string;
  confianza?: number;
  flags?: string[];
  contextCompleteness?: Record<string, unknown>;
  contexto?: Record<string, unknown>;
  provider?: string;
  model?: string;
  debug?: { rawContent?: string };
};

interface ContextualAiSavePanelProps {
  patientId: string;
  dietPlanId?: string;
  mealSlotId?: string;
  preguntaOriginal: string;
  response: SaveableResponse;
}

export function ContextualAiSavePanel({
  patientId,
  dietPlanId,
  mealSlotId,
  preguntaOriginal,
  response,
}: ContextualAiSavePanelProps) {
  const [saving, setSaving] = useState<ContextualSaveKind | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(saveKind: ContextualSaveKind) {
    setSaving(saveKind);
    setError(null);
    setSavedId(null);
    try {
      const result = await saveContextualAiDraft({
        patientId,
        dietPlanId: dietPlanId || undefined,
        mealSlotId: mealSlotId || undefined,
        saveKind,
        preguntaOriginal,
        aiResponse: {
          ...response,
          provider: response.provider ?? "ollama_local",
        },
      });
      setSavedId(result.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-3 border-t pt-3">
      <Alert className="border-amber-200 bg-amber-50">
        <AlertTitle>Revisión obligatoria</AlertTitle>
        <AlertDescription>
          Esta respuesta fue generada por IA local y debe revisarse antes de mostrarse al paciente.
        </AlertDescription>
      </Alert>

      {response.requiere_revision_nutriologa && response.motivo_revision && (
        <p className="text-xs text-amber-900">
          Requiere revisión de nutrióloga por: {response.motivo_revision}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={!!saving}
          onClick={() => void handleSave("ia_note")}
        >
          {saving === "ia_note" ? "Guardando…" : "Guardar como nota IA"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={!!saving}
          onClick={() => void handleSave("menu_draft")}
        >
          {saving === "menu_draft" ? "Guardando…" : "Guardar como menú borrador"}
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={!!saving}
          onClick={() => void handleSave("pending_suggestion")}
        >
          {saving === "pending_suggestion" ? "Guardando…" : "Guardar como sugerencia pendiente"}
        </Button>
      </div>

      {savedId && (
        <Alert className="border-emerald-200 bg-emerald-50">
          <AlertTitle>Borrador guardado</AlertTitle>
          <AlertDescription className="space-y-1">
            <p>ID: <Badge variant="outline">{savedId}</Badge></p>
            <Link
              href={`/nutriologo/pacientes/${patientId}/menus/${savedId}`}
              className="text-sm text-emerald-800 underline"
            >
              Ver detalle del borrador →
            </Link>
            {" · "}
            <Link
              href={`/nutriologo/pacientes/${patientId}/menus?status=draft`}
              className="text-sm text-emerald-800 underline"
            >
              Ver todos los menús
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert>
          <AlertTitle>Error al guardar</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
