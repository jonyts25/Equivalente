"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getIaPanelDietPlans,
  getIaPanelMealSlots,
  previewIaContext,
} from "@/app/actions/equivalente-ia";
import { OLLAMA_TEST_CASES } from "@/components/admin/OllamaLocalPanel";
import { ContextualAiSavePanel } from "@/components/admin/ContextualAiSavePanel";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import type { EquivalenteIntention } from "@/lib/ai/nutrition-safety";

type PatientOption = {
  id: string;
  full_name: string;
  precision_mode: string;
};

type DietOption = { id: string; title: string; status: string };
type MealSlotOption = { id: string; name: string; slot_order: number; notes: string | null };

type ContextCompleteness = {
  hasActiveDiet: boolean;
  hasMealSlot: boolean;
  hasEquivalences: boolean;
  hasPreferences: boolean;
  hasForbiddenTreats: boolean;
  equivalenceGroupCount?: number;
  equivalenceItemCount?: number;
  hasDemoEquivalences?: boolean;
};

type ContextualResponse = {
  ok: boolean;
  provider?: string;
  model?: string;
  intencion?: string;
  alimentos_detectados?: string[];
  respuesta_paciente?: string;
  requiere_revision_nutriologa?: boolean;
  motivo_revision?: string;
  confianza?: number;
  flags?: string[];
  contextCompleteness?: ContextCompleteness;
  contexto?: Record<string, unknown>;
  error?: string;
  message?: string;
  debug?: { rawContent?: string };
};

function CompletenessRow({ label, value }: { label: string; value: boolean }) {
  return (
    <div className="flex justify-between text-sm">
      <span>{label}</span>
      <Badge className={value ? "bg-emerald-100 text-emerald-900" : "bg-slate-100 text-slate-600"}>
        {value ? "sí" : "no"}
      </Badge>
    </div>
  );
}

export function OllamaContextualSection({
  patients,
  defaultModel,
  availableModels,
  healthOk,
}: {
  patients: PatientOption[];
  defaultModel: string;
  availableModels: string[];
  healthOk: boolean;
}) {
  const [patientId, setPatientId] = useState(patients[0]?.id ?? "");
  const [dietPlanId, setDietPlanId] = useState("");
  const [mealSlotId, setMealSlotId] = useState("");
  const [diets, setDiets] = useState<DietOption[]>([]);
  const [mealSlots, setMealSlots] = useState<MealSlotOption[]>([]);
  const [caseKey, setCaseKey] = useState<EquivalenteIntention>("sustitucion_alimento");
  const [texto, setTexto] = useState(OLLAMA_TEST_CASES.sustitucion_alimento.texto);
  const [model, setModel] = useState(defaultModel);
  const [completeness, setCompleteness] = useState<ContextCompleteness | null>(null);
  const [response, setResponse] = useState<ContextualResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);

  const refreshPreview = useCallback(async (pid: string, did: string, mid: string) => {
    if (!pid) {
      setCompleteness(null);
      return;
    }
    try {
      const preview = await previewIaContext({
        patientId: pid,
        dietPlanId: did || undefined,
        mealSlotId: mid || undefined,
      });
      setCompleteness({
        ...preview.contextCompleteness,
        equivalenceGroupCount: preview.contexto.equivalenceGroupCount,
        equivalenceItemCount: preview.contexto.equivalenceItemCount,
        hasDemoEquivalences: preview.contexto.hasDemoEquivalences,
      });
    } catch {
      setCompleteness(null);
    }
  }, []);

  useEffect(() => {
    if (!patientId) return;
    void (async () => {
      setLoading(true);
      try {
        const plans = await getIaPanelDietPlans(patientId);
        setDiets(plans);
        const active = plans.find((p) => p.status === "active") ?? plans[0];
        const did = active?.id ?? "";
        setDietPlanId(did);
        if (did) {
          const slots = await getIaPanelMealSlots(did);
          setMealSlots(slots);
          const firstSlot = slots[0]?.id ?? "";
          setMealSlotId(firstSlot);
          await refreshPreview(patientId, did, firstSlot);
        } else {
          setMealSlots([]);
          setMealSlotId("");
          await refreshPreview(patientId, "", "");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error cargando paciente");
      } finally {
        setLoading(false);
      }
    })();
  }, [patientId, refreshPreview]);

  async function onDietChange(did: string) {
    setDietPlanId(did);
    setMealSlotId("");
    setMealSlots([]);
    if (!did) {
      await refreshPreview(patientId, "", "");
      return;
    }
    const slots = await getIaPanelMealSlots(did);
    setMealSlots(slots);
    const sid = slots[0]?.id ?? "";
    setMealSlotId(sid);
    await refreshPreview(patientId, did, sid);
  }

  async function onMealSlotChange(sid: string) {
    setMealSlotId(sid);
    await refreshPreview(patientId, dietPlanId, sid);
  }

  function selectCase(key: EquivalenteIntention) {
    setCaseKey(key);
    setTexto(OLLAMA_TEST_CASES[key].texto);
    setResponse(null);
    setError(null);
  }

  async function runContextual() {
    setLoading(true);
    setError(null);
    setResponse(null);
    try {
      const res = await fetch("/api/ai/equivalente/contextual", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          patientId,
          dietPlanId: dietPlanId || undefined,
          mealSlotId: mealSlotId || undefined,
          texto,
          hintIntencion: caseKey,
          model: model || undefined,
          debug: true,
        }),
      });
      const data = (await res.json()) as ContextualResponse;
      setResponse(data);
      if (data.contextCompleteness) setCompleteness(data.contextCompleteness);
      if (!data.ok) setError(data.message ?? data.error ?? "Error");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }

  if (patients.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">Probar con contexto de paciente</CardTitle></CardHeader>
        <CardContent className="text-sm text-slate-500">No hay pacientes disponibles para tu rol.</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Probar con contexto de paciente</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="ctx-patient">Paciente</Label>
            <select
              id="ctx-patient"
              className="w-full rounded-md border bg-white px-3 py-2 text-sm"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name} ({p.precision_mode})
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ctx-diet">Dieta</Label>
            <select
              id="ctx-diet"
              className="w-full rounded-md border bg-white px-3 py-2 text-sm"
              value={dietPlanId}
              onChange={(e) => void onDietChange(e.target.value)}
            >
              <option value="">— Sin dieta —</option>
              {diets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title} ({d.status})
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ctx-meal">Comida / meal slot</Label>
            <select
              id="ctx-meal"
              className="w-full rounded-md border bg-white px-3 py-2 text-sm"
              value={mealSlotId}
              onChange={(e) => void onMealSlotChange(e.target.value)}
              disabled={!dietPlanId}
            >
              <option value="">— Sin comida —</option>
              {mealSlots.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ctx-case">Intención</Label>
            <select
              id="ctx-case"
              className="w-full rounded-md border bg-white px-3 py-2 text-sm"
              value={caseKey}
              onChange={(e) => selectCase(e.target.value as EquivalenteIntention)}
            >
              {(Object.keys(OLLAMA_TEST_CASES) as EquivalenteIntention[]).map((key) => (
                <option key={key} value={key}>{OLLAMA_TEST_CASES[key].label}</option>
              ))}
            </select>
          </div>
        </div>

        {completeness && (
          <div className="rounded-lg border bg-slate-50 p-3 space-y-1">
            <p className="text-xs font-medium uppercase text-slate-500 mb-2">Context completeness</p>
            <CompletenessRow label="Dieta activa" value={completeness.hasActiveDiet} />
            <CompletenessRow label="Comida seleccionada" value={completeness.hasMealSlot} />
            <CompletenessRow label="Equivalencias" value={completeness.hasEquivalences} />
            {completeness.hasEquivalences && (
              <p className="text-xs text-slate-600 pl-1">
                {completeness.equivalenceGroupCount ?? "?"} grupos · {completeness.equivalenceItemCount ?? "?"} ítems
                {completeness.hasDemoEquivalences && " · incluye datos demo"}
              </p>
            )}
            <CompletenessRow label="Preferencias" value={completeness.hasPreferences} />
            <CompletenessRow label="Gustos prohibidos" value={completeness.hasForbiddenTreats} />
            {!completeness.hasEquivalences ? (
              <Alert className="mt-2">
                <AlertTitle>Sin equivalencias cargadas</AlertTitle>
                <AlertDescription>
                  Las sustituciones requerirán revisión de nutrióloga.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="mt-2 border-emerald-200 bg-emerald-50">
                <AlertTitle>Equivalencias cargadas</AlertTitle>
                <AlertDescription>
                  La IA puede orientar con más contexto, pero la nutrióloga debe validar cambios
                  {completeness.hasDemoEquivalences ? " (datos demo en seed)" : ""}.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="ctx-texto">Pregunta</Label>
          <Textarea id="ctx-texto" value={texto} onChange={(e) => setTexto(e.target.value)} rows={3} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ctx-model">Modelo</Label>
          <select
            id="ctx-model"
            className="w-full rounded-md border bg-white px-3 py-2 text-sm"
            value={model}
            onChange={(e) => setModel(e.target.value)}
          >
            {availableModels.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        <Button
          type="button"
          onClick={runContextual}
          disabled={loading || !texto.trim() || !patientId || !healthOk}
        >
          {loading ? "Consultando..." : "Probar con contexto"}
        </Button>

        {error && (
          <Alert>
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {response?.ok && (
          <div className="space-y-3 rounded-lg border bg-slate-50 p-4">
            {response.requiere_revision_nutriologa && (
              <Badge className="bg-amber-100 text-amber-900">Requiere revisión nutrióloga</Badge>
            )}
            <p className="text-sm leading-relaxed">{response.respuesta_paciente}</p>
            {response.motivo_revision && (
              <p className="text-xs text-slate-600"><strong>Motivo:</strong> {response.motivo_revision}</p>
            )}
            {response.flags && (
              <div className="flex flex-wrap gap-1">
                {response.flags.map((f) => (
                  <Badge key={f} variant="outline" className="text-xs font-normal">{f}</Badge>
                ))}
              </div>
            )}
            {response.contexto && (
              <div>
                <p className="text-xs font-medium uppercase text-slate-500 mb-1">Contexto usado (resumen)</p>
                <pre className="max-h-32 overflow-auto rounded border bg-white p-2 text-xs">
                  {JSON.stringify(response.contexto, null, 2)}
                </pre>
              </div>
            )}
            <pre className="max-h-64 overflow-auto rounded border bg-white p-3 text-xs">
              {JSON.stringify(response, null, 2)}
            </pre>
            {response.debug?.rawContent && (
              <div>
                <button type="button" className="text-xs text-emerald-700 underline" onClick={() => setShowDebug((v) => !v)}>
                  {showDebug ? "Ocultar" : "Mostrar"} raw/debug
                </button>
                {showDebug && (
                  <pre className="mt-2 max-h-48 overflow-auto rounded border bg-white p-3 text-xs">
                    {response.debug.rawContent}
                  </pre>
                )}
              </div>
            )}

            <ContextualAiSavePanel
              patientId={patientId}
              dietPlanId={dietPlanId || undefined}
              mealSlotId={mealSlotId || undefined}
              preguntaOriginal={texto}
              response={{
                provider: response.provider,
                model: response.model,
                intencion: response.intencion,
                alimentos_detectados: response.alimentos_detectados,
                respuesta_paciente: response.respuesta_paciente,
                requiere_revision_nutriologa: response.requiere_revision_nutriologa,
                motivo_revision: response.motivo_revision,
                confianza: response.confianza,
                flags: response.flags,
                contextCompleteness: response.contextCompleteness,
                contexto: response.contexto,
                debug: response.debug,
              }}
            />

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setResponse(null)}
            >
              Descartar respuesta
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
