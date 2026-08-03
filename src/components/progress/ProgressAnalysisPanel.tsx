"use client";

import { useMemo, useState } from "react";
import {
  archiveProgressAnalysis,
  setProgressAnalysisVisibility,
} from "@/app/actions/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ProgressAiAnalysis } from "@/lib/progress/types";

export function ProgressAnalysisPanel({
  patientId,
  checkinCount,
  compositionCount,
  missingNotes,
  existingAnalyses,
  minCheckinDate,
  maxCheckinDate,
}: {
  patientId: string;
  checkinCount: number;
  compositionCount: number;
  missingNotes: string[];
  existingAnalyses: ProgressAiAnalysis[];
  minCheckinDate?: string | null;
  maxCheckinDate?: string | null;
}) {
  const [loading, setLoading] = useState(false);
  const [rangeStart, setRangeStart] = useState(minCheckinDate ?? "");
  const [rangeEnd, setRangeEnd] = useState(maxCheckinDate ?? "");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notesById, setNotesById] = useState<Record<string, string>>({});

  const preview = useMemo(
    () => ({
      checkins: checkinCount,
      composition: compositionCount,
      rangeStart: rangeStart || "todo",
      rangeEnd: rangeEnd || "todo",
      missing: missingNotes,
    }),
    [checkinCount, compositionCount, rangeStart, rangeEnd, missingNotes]
  );

  async function runAnalysis(save: boolean) {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/ai/equivalente/progress-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          patientId,
          rangeStart: rangeStart || undefined,
          rangeEnd: rangeEnd || undefined,
          save,
        }),
      });
      const data = (await res.json()) as Record<string, unknown>;
      if (!data.ok) {
        setError(String(data.message ?? data.error ?? "Error"));
        return;
      }
      setResult(data);
      if (save) window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }

  async function toggleVisibility(analysisId: string, visible: boolean) {
    await setProgressAnalysisVisibility(
      analysisId,
      patientId,
      visible,
      notesById[analysisId] || null
    );
    window.location.reload();
  }

  async function handleArchive(analysisId: string) {
    if (!confirm("¿Eliminar este análisis?")) return;
    await archiveProgressAnalysis(analysisId, patientId);
    window.location.reload();
  }

  return (
    <div className="space-y-4">
      <Alert className="border-amber-200 bg-amber-50">
        <AlertTitle>Análisis orientativo — no diagnóstico</AlertTitle>
        <AlertDescription>
          Ollama local analiza tendencias. Todo resultado queda como borrador oculto al paciente
          hasta que lo publiques. No modifica dieta ni sugiere medicamentos.
        </AlertDescription>
      </Alert>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="range-start">Desde</Label>
          <Input id="range-start" type="date" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="range-end">Hasta</Label>
          <Input id="range-end" type="date" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} />
        </div>
      </div>

      <div className="rounded-lg border bg-slate-50 p-3 text-sm space-y-1">
        <p className="font-medium">Vista previa del contexto</p>
        <p>Check-ins en rango: {preview.checkins} · Composición: {preview.composition}</p>
        <p className="text-xs text-slate-600">
          Rango: {String(preview.rangeStart)} → {String(preview.rangeEnd)}
        </p>
        {preview.missing.map((n) => (
          <p key={n} className="text-xs text-amber-800">· {n}</p>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={() => void runAnalysis(true)}
          disabled={loading || checkinCount === 0}
        >
          {loading ? "Analizando…" : "Analizar y guardar borrador"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => void runAnalysis(false)}
          disabled={loading || checkinCount === 0}
        >
          Vista previa sin guardar
        </Button>
      </div>

      {error && (
        <Alert>
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {result && (
        <div className="space-y-2 rounded-lg border p-4">
          <Badge className="bg-amber-100 text-amber-900">Requiere revisión nutrióloga</Badge>
          <p className="text-sm leading-relaxed">{String(result.summary)}</p>
          {"trend" in result && result.trend != null && typeof result.trend === "object" ? (
            <pre className="text-xs bg-slate-50 p-2 rounded overflow-x-auto">
              {JSON.stringify(result.trend, null, 2)}
            </pre>
          ) : null}
          {Array.isArray(result.flags) && (
            <div className="flex flex-wrap gap-1">
              {(result.flags as string[]).map((f) => (
                <Badge key={f} variant="outline" className="text-xs font-normal">{f}</Badge>
              ))}
            </div>
          )}
          {result.savedAnalysisId != null && (
            <p className="text-xs text-slate-500">Guardado: {String(result.savedAnalysisId)}</p>
          )}
        </div>
      )}

      {existingAnalyses.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium">Análisis guardados (borradores)</p>
          {existingAnalyses.map((a) => (
            <div key={a.id} className="rounded border p-3 text-sm space-y-2">
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs text-slate-500">
                  {new Date(a.analysis_date).toLocaleString("es-MX")}
                </span>
                {a.visible_to_patient ? (
                  <Badge className="bg-emerald-100 text-emerald-900">Visible al paciente</Badge>
                ) : (
                  <Badge variant="secondary">Borrador oculto</Badge>
                )}
                {a.requires_nutritionist_review && (
                  <Badge variant="outline">Pendiente revisión</Badge>
                )}
              </div>
              <p>{a.summary}</p>
              <div className="space-y-2">
                <Label htmlFor={`notes-${a.id}`}>Notas nutrióloga</Label>
                <Textarea
                  id={`notes-${a.id}`}
                  defaultValue={a.nutritionist_notes ?? ""}
                  rows={2}
                  onChange={(e) =>
                    setNotesById((prev) => ({ ...prev, [a.id]: e.target.value }))
                  }
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {!a.visible_to_patient && (
                  <Button size="sm" onClick={() => void toggleVisibility(a.id, true)}>
                    Publicar al paciente
                  </Button>
                )}
                {a.visible_to_patient && (
                  <Button size="sm" variant="secondary" onClick={() => void toggleVisibility(a.id, false)}>
                    Ocultar del paciente
                  </Button>
                )}
                <Button size="sm" variant="destructive" onClick={() => void handleArchive(a.id)}>
                  Eliminar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
