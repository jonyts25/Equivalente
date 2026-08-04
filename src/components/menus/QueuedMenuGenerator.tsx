"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { prepareAiTask } from "@/app/actions/ai";
import { validateAndSaveMenu } from "@/app/actions/menus";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  mealOptionsResponseSchema,
  type MealOptionsResponse,
} from "@/lib/ai/schemas/meal-options.schema";
import type { ManualAiTaskType, MenuStatus } from "@/types/database";

interface QueuedMenuGeneratorProps {
  patientId: string;
  task: ManualAiTaskType;
  context: Record<string, string | number | undefined>;
  title: string;
  defaultStatus?: MenuStatus;
}

type Phase = "idle" | "waiting" | "done" | "error";

function isTerminalSuccess(status: string): boolean {
  return status === "done" || status === "completed";
}

function isTerminalError(status: string): boolean {
  return status === "error" || status === "failed";
}

function parseMealOptionsPreview(
  preview: Record<string, unknown>
): MealOptionsResponse | null {
  const direct = mealOptionsResponseSchema.safeParse(preview);
  if (direct.success) return direct.data;

  // Worker may wrap the payload (e.g. { result: {...} } or JSON string fields).
  for (const key of ["result", "data", "content", "raw"] as const) {
    const value = preview[key];
    if (typeof value === "string") {
      try {
        const parsed = mealOptionsResponseSchema.safeParse(JSON.parse(value));
        if (parsed.success) return parsed.data;
      } catch {
        /* ignore */
      }
    } else if (value && typeof value === "object") {
      const parsed = mealOptionsResponseSchema.safeParse(value);
      if (parsed.success) return parsed.data;
    }
  }

  return null;
}

function confidenceBadgeVariant(
  confidence: "low" | "medium" | "high"
): "default" | "warning" | "secondary" {
  if (confidence === "high") return "default";
  if (confidence === "medium") return "warning";
  return "secondary";
}

export function QueuedMenuGenerator({
  patientId,
  task,
  context,
  title,
  defaultStatus,
}: QueuedMenuGeneratorProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [jobId, setJobId] = useState<string | null>(null);
  const [resultJson, setResultJson] = useState<string | null>(null);
  const [resultPreview, setResultPreview] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const applyTerminalResult = useCallback(
    (status: string, result: unknown, errMsg?: string | null) => {
      if (isTerminalSuccess(status)) {
        stopPolling();
        let asObject: Record<string, unknown> | null = null;
        if (typeof result === "string") {
          try {
            const parsed = JSON.parse(result) as unknown;
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
              asObject = parsed as Record<string, unknown>;
            }
          } catch {
            asObject = { raw: result };
          }
        } else if (result && typeof result === "object" && !Array.isArray(result)) {
          asObject = result as Record<string, unknown>;
        } else {
          asObject = { raw: result };
        }

        const mealParsed = asObject ? parseMealOptionsPreview(asObject) : null;
        setResultJson(
          mealParsed
            ? JSON.stringify(mealParsed, null, 2)
            : typeof result === "string"
              ? result
              : JSON.stringify(result ?? {}, null, 2)
        );
        setResultPreview(asObject ?? { raw: result });
        setPhase("done");
        return true;
      }
      if (isTerminalError(status)) {
        stopPolling();
        setPhase("error");
        setError(errMsg ?? "La IA local falló al procesar la tarea.");
        return true;
      }
      return false;
    },
    [stopPolling]
  );

  const pollOnce = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/ai/jobs/${id}/status`);
      const data = (await res.json()) as {
        ok?: boolean;
        status?: string;
        result?: unknown;
        error?: string;
        message?: string;
      };

      if (!res.ok || !data.ok) {
        throw new Error(data.message ?? data.error ?? "No se pudo consultar el job.");
      }

      applyTerminalResult(String(data.status ?? ""), data.result, data.error ?? data.message);
    },
    [applyTerminalResult]
  );

  function startPolling(id: string) {
    stopPolling();
    pollRef.current = setInterval(() => {
      void pollOnce(id).catch((e) => {
        stopPolling();
        setPhase("error");
        setError(e instanceof Error ? e.message : "Error de polling");
      });
    }, 3000);
  }

  async function handleGenerate() {
    setError(null);
    setMessage(null);
    setResultJson(null);
    setResultPreview(null);
    setPhase("waiting");
    stopPolling();

    try {
      const result = await prepareAiTask({
        taskType: task,
        context,
        patientId,
      });

      if (result.mode !== "queued") {
        setPhase("error");
        setError(
          `El proveedor activo no encoló la tarea (mode=${result.mode}). Configura AI_PROVIDER=ollama_queue.`
        );
        return;
      }

      setJobId(result.jobId);

      const res = await fetch(`/api/ai/jobs/${result.jobId}/status`);
      const data = (await res.json()) as {
        ok?: boolean;
        status?: string;
        result?: unknown;
        error?: string;
        message?: string;
      };

      if (!res.ok || !data.ok) {
        throw new Error(data.message ?? data.error ?? "No se pudo consultar el job.");
      }

      const finished = applyTerminalResult(
        String(data.status ?? ""),
        data.result,
        data.error ?? data.message
      );
      if (!finished) {
        startPolling(result.jobId);
      }
    } catch (e) {
      stopPolling();
      setPhase("error");
      setError(e instanceof Error ? e.message : "Error al encolar la tarea");
    }
  }

  async function handleSave() {
    if (!resultJson) return;
    setSaving(true);
    setMessage(null);
    try {
      await validateAndSaveMenu({
        patientId,
        taskType: task,
        pastedResponse: resultJson,
        title,
        context,
        status: defaultStatus,
      });
      setMessage("Menú guardado.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  const parsedOptions =
    phase === "done" && resultPreview ? parseMealOptionsPreview(resultPreview) : null;

  return (
    <div className="space-y-4">
      <Alert className="border-emerald-200 bg-emerald-50">
        <AlertTitle>IA local en cola</AlertTitle>
        <AlertDescription>
          La tarea se procesa en tu PC con Ollama. No uses ChatGPT en este modo.
        </AlertDescription>
      </Alert>

      {phase === "idle" && (
        <Button type="button" onClick={() => void handleGenerate()}>
          Generar
        </Button>
      )}

      {phase === "waiting" && (
        <div className="flex items-start gap-3 rounded-lg border bg-slate-50 p-4 text-sm">
          <span
            className="mt-0.5 inline-block h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent"
            aria-hidden
          />
          <div>
            <p className="font-medium text-slate-800">
              Procesando con IA local... esto puede tardar unos minutos, tu PC debe estar encendida
            </p>
            {jobId && <p className="mt-1 text-xs text-slate-500">Job: {jobId}</p>}
          </div>
        </div>
      )}

      {phase === "error" && (
        <div className="space-y-3">
          <Alert>
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error ?? "Error desconocido"}</AlertDescription>
          </Alert>
          <Button type="button" onClick={() => void handleGenerate()}>
            Reintentar
          </Button>
        </div>
      )}

      {phase === "done" && resultPreview && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-emerald-800">Resultado listo</p>

          {parsedOptions?.options && parsedOptions.options.length > 0 ? (
            <div className="space-y-3">
              {parsedOptions.message && (
                <p className="text-sm text-slate-600">{parsedOptions.message}</p>
              )}
              {parsedOptions.options.map((option, index) => (
                <Card key={`${option.title}-${index}`}>
                  <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
                    <div className="space-y-2">
                      <CardTitle className="text-base">{option.title}</CardTitle>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant="outline">{option.meal_slot}</Badge>
                        <Badge variant={confidenceBadgeVariant(option.confidence)}>
                          {option.confidence}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <ul className="space-y-1">
                      {option.ingredients.map((ing, i) => (
                        <li key={`${ing.name}-${i}`}>
                          <span className="font-medium">{ing.name}</span>
                          {ing.portion ? ` — ${ing.portion}` : ""}
                          {ing.notes ? (
                            <span className="text-slate-500"> ({ing.notes})</span>
                          ) : null}
                        </li>
                      ))}
                    </ul>

                    {option.preparation && (
                      <p className="text-slate-700">{option.preparation}</p>
                    )}

                    {option.replaces && (
                      <p className="text-xs text-slate-500">Reemplaza: {option.replaces}</p>
                    )}

                    {option.equivalences.length > 0 && (
                      <ul className="space-y-1 text-xs text-slate-500">
                        {option.equivalences.map((eq, i) => (
                          <li key={`${eq.base}-${eq.replacement}-${i}`}>
                            {eq.base} → {eq.replacement}
                            {eq.explanation ? `: ${eq.explanation}` : ""}
                          </li>
                        ))}
                      </ul>
                    )}

                    {option.warnings && option.warnings.length > 0 && (
                      <Alert>
                        <AlertTitle>Advertencias</AlertTitle>
                        <AlertDescription>
                          <ul className="list-disc space-y-1 pl-4">
                            {option.warnings.map((warning, i) => (
                              <li key={`${warning}-${i}`}>{warning}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <pre className="max-h-72 overflow-auto rounded-lg border bg-white p-3 text-xs">
              {JSON.stringify(resultPreview, null, 2)}
            </pre>
          )}

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => void handleSave()} disabled={saving || !resultJson}>
              {saving ? "Guardando..." : "Guardar resultado"}
            </Button>
            <Button type="button" variant="outline" onClick={() => void handleGenerate()}>
              Generar de nuevo
            </Button>
          </div>
        </div>
      )}

      {message && <p className="text-sm text-emerald-700">{message}</p>}
    </div>
  );
}
