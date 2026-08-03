"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import type { EquivalenteIntention } from "@/lib/ai/nutrition-safety";
import { OllamaContextualSection } from "@/components/admin/OllamaContextualSection";

export const OLLAMA_TEST_CASES: Record<
  EquivalenteIntention,
  { label: string; texto: string }
> = {
  sustitucion_alimento: {
    label: "Sustitución de alimento",
    texto: "¿Puedo cambiar 2 tortillas por arroz?",
  },
  antojo: {
    label: "Antojo",
    texto: "Tengo antojo de mazapán",
  },
  ingrediente_disponible: {
    label: "Ingredientes disponibles",
    texto: "Solo tengo pollo, huevo y aguacate, ¿qué puedo cenar?",
  },
  duda_porcion: {
    label: "Duda de porción",
    texto: "¿Cuánto arroz equivale a una tortilla?",
  },
  otro: {
    label: "Otro / desviación del plan",
    texto: "Me comí algo fuera de la dieta, ¿qué hago?",
  },
};

type HealthState = {
  ok: boolean;
  models?: string[];
  error?: string;
  checkedAt?: string;
};

type EquivalenteResponse = {
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
  error?: string;
  message?: string;
  rawPreview?: string;
  debug?: { rawContent?: string };
};

export interface OllamaLocalPanelProps {
  env: {
    aiProvider: string;
    enableOllama: string;
    enableOllamaDevApi: string;
    defaultModel: string;
    ollamaBaseUrl: string;
    timeoutMs: number;
    modelsConfigured: {
      fast: string;
      spanish: string;
      smart: string;
      embed: string;
    };
  };
  initialHealth: {
    ok: boolean;
    models?: string[];
    error?: string;
    checkedAt: string;
  };
  patients: Array<{ id: string; full_name: string; precision_mode: string }>;
}

function confidenceBadge(confianza?: number) {
  if (confianza === undefined) return null;
  if (confianza <= 0.55) return <Badge className="bg-amber-100 text-amber-900">Confianza baja</Badge>;
  if (confianza <= 0.75) return <Badge className="bg-sky-100 text-sky-900">Confianza media</Badge>;
  return <Badge className="bg-emerald-100 text-emerald-900">Confianza alta</Badge>;
}

export function OllamaLocalPanel({ env, initialHealth, patients }: OllamaLocalPanelProps) {
  const [texto, setTexto] = useState(OLLAMA_TEST_CASES.sustitucion_alimento.texto);
  const [caseKey, setCaseKey] = useState<EquivalenteIntention>("sustitucion_alimento");
  const [model, setModel] = useState(env.defaultModel);
  const [health, setHealth] = useState<HealthState>(() => ({
    ...initialHealth,
    checkedAt: new Date(initialHealth.checkedAt).toLocaleString("es-MX"),
  }));
  const [response, setResponse] = useState<EquivalenteResponse | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableModels = health?.models?.length
    ? health.models
    : [
        env.modelsConfigured.spanish,
        env.modelsConfigured.fast,
        env.modelsConfigured.smart,
      ];

  const checkHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/health");
      const data = (await res.json()) as HealthState;
      setHealth({ ...data, checkedAt: new Date().toLocaleString("es-MX") });
      if (!data.ok) setError(data.error ?? "Ollama no disponible");
    } catch (e) {
      setHealth({ ok: false, error: e instanceof Error ? e.message : "Error de red" });
      setError(e instanceof Error ? e.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }, []);

  function selectCase(key: EquivalenteIntention) {
    setCaseKey(key);
    setTexto(OLLAMA_TEST_CASES[key].texto);
    setResponse(null);
    setError(null);
  }

  function clearAll() {
    setTexto("");
    setResponse(null);
    setError(null);
    setShowDebug(false);
  }

  async function runPilot() {
    setLoading(true);
    setError(null);
    setResponse(null);
    try {
      const res = await fetch("/api/ai/equivalente", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          texto,
          model: model || undefined,
          hintIntencion: caseKey,
          debug: true,
        }),
      });
      const data = (await res.json()) as EquivalenteResponse;
      setResponse(data);
      if (!data.ok) setError(data.message ?? data.error ?? "Error de IA");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <OllamaContextualSection
        patients={patients}
        defaultModel={env.defaultModel}
        availableModels={availableModels}
        healthOk={Boolean(health?.ok)}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Piloto libre (sin contexto de paciente)</CardTitle>
        </CardHeader>
        <CardContent className="pb-0">
          <p className="mb-4 text-xs text-slate-500">
            Usa este modo para probar guardrails genéricos sin dieta ni equivalencias cargadas.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Estado de Ollama</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={health?.ok ? "bg-emerald-100 text-emerald-900" : "bg-red-100 text-red-900"}>
              {health?.ok ? "Disponible" : "No disponible"}
            </Badge>
            <Badge variant="outline">provider: ollama_local</Badge>
          </div>
          <dl className="grid gap-1 text-slate-600">
            <div><dt className="inline font-medium">AI_PROVIDER:</dt> {env.aiProvider}</div>
            <div><dt className="inline font-medium">ENABLE_OLLAMA:</dt> {env.enableOllama}</div>
            <div><dt className="inline font-medium">ENABLE_OLLAMA_DEV_API:</dt> {env.enableOllamaDevApi}</div>
            <div><dt className="inline font-medium">Base URL:</dt> {env.ollamaBaseUrl}</div>
            <div><dt className="inline font-medium">Timeout:</dt> {env.timeoutMs} ms</div>
            <div><dt className="inline font-medium">Modelo default:</dt> {env.defaultModel}</div>
            {health?.checkedAt && (
              <div><dt className="inline font-medium">Último health:</dt> {health.checkedAt}</div>
            )}
          </dl>
          {health?.models && health.models.length > 0 && (
            <div>
              <p className="mb-1 font-medium">Modelos instalados</p>
              <div className="flex flex-wrap gap-1">
                {health.models.map((m) => (
                  <Badge key={m} variant="outline" className="font-normal">{m}</Badge>
                ))}
              </div>
            </div>
          )}
          {health?.error && !health.ok && (
            <Alert>
              <AlertTitle>Ollama apagado o inaccesible</AlertTitle>
              <AlertDescription>{health.error}</AlertDescription>
            </Alert>
          )}
          <Button type="button" variant="outline" size="sm" onClick={checkHealth} disabled={loading}>
            Probar health
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Herramienta de prueba</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="case">Caso de prueba</Label>
            <select
              id="case"
              className="w-full rounded-md border bg-white px-3 py-2 text-sm"
              value={caseKey}
              onChange={(e) => selectCase(e.target.value as EquivalenteIntention)}
            >
              {(Object.keys(OLLAMA_TEST_CASES) as EquivalenteIntention[]).map((key) => (
                <option key={key} value={key}>
                  {OLLAMA_TEST_CASES[key].label} ({key})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">Modelo</Label>
            <select
              id="model"
              className="w-full rounded-md border bg-white px-3 py-2 text-sm"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            >
              {availableModels.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="texto">Consulta del paciente</Label>
            <Textarea
              id="texto"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={4}
              placeholder="Escribe una duda nutricional..."
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={runPilot} disabled={loading || !texto.trim() || !health?.ok}>
              {loading ? "Consultando..." : "Probar IA local"}
            </Button>
            <Button type="button" variant="outline" onClick={checkHealth} disabled={loading}>
              Probar health
            </Button>
            <Button type="button" variant="ghost" onClick={clearAll} disabled={loading}>
              Limpiar
            </Button>
          </div>

          {error && (
            <Alert>
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {response?.ok && (
            <div className="space-y-3 rounded-lg border bg-slate-50 p-4">
              <div className="flex flex-wrap gap-2">
                {response.requiere_revision_nutriologa && (
                  <Badge className="bg-amber-100 text-amber-900">Requiere revisión nutrióloga</Badge>
                )}
                {confidenceBadge(response.confianza)}
                {response.flags?.includes("permissive_response_corrected") && (
                  <Badge className="bg-violet-100 text-violet-900">Respuesta permisiva corregida</Badge>
                )}
                {response.flags?.some((f) => f.startsWith("missing_")) && (
                  <Badge variant="outline">Faltan datos de contexto</Badge>
                )}
              </div>

              <div>
                <p className="mb-1 text-xs font-medium uppercase text-slate-500">Respuesta para paciente</p>
                <p className="text-sm leading-relaxed">{response.respuesta_paciente}</p>
              </div>

              {response.motivo_revision && (
                <p className="text-xs text-slate-600">
                  <strong>Motivo revisión:</strong> {response.motivo_revision}
                </p>
              )}

              {response.flags && response.flags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {response.flags.map((f) => (
                    <Badge key={f} variant="outline" className="font-normal text-xs">{f}</Badge>
                  ))}
                </div>
              )}

              <div>
                <p className="mb-1 text-xs font-medium uppercase text-slate-500">JSON</p>
                <pre className="max-h-64 overflow-auto rounded border bg-white p-3 text-xs">
                  {JSON.stringify(response, null, 2)}
                </pre>
              </div>

              {response.debug?.rawContent && (
                <div>
                  <button
                    type="button"
                    className="text-xs text-emerald-700 underline"
                    onClick={() => setShowDebug((v) => !v)}
                  >
                    {showDebug ? "Ocultar" : "Mostrar"} raw/debug (solo admin)
                  </button>
                  {showDebug && (
                    <pre className="mt-2 max-h-48 overflow-auto rounded border bg-white p-3 text-xs">
                      {response.debug.rawContent}
                    </pre>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-slate-500">
        MVP admin/dev — server-side only. No expuesto a pacientes. No aprueba menús clínicos.
        Flujo: panel → POST /api/ai/equivalente → runEquivalentePilot → nutrition-safety → Ollama.
      </p>
    </div>
  );
}
