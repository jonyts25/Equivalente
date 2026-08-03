"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { prepareAiTask } from "@/app/actions/ai";
import { validateAndSaveMenu } from "@/app/actions/menus";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
        const asText =
          typeof result === "string" ? result : JSON.stringify(result ?? {}, null, 2);
        setResultJson(asText);
        setResultPreview(
          result && typeof result === "object" && !Array.isArray(result)
            ? (result as Record<string, unknown>)
            : { raw: result }
        );
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
          <pre className="max-h-72 overflow-auto rounded-lg border bg-white p-3 text-xs">
            {JSON.stringify(resultPreview, null, 2)}
          </pre>
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
