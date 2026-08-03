import type { ProgressAiAnalysisPayload } from "@/lib/progress/types";
import { normalizeTrendDirection } from "./prompts/progress-analysis";

const FORBIDDEN_PATTERNS: RegExp[] = [
  /\bdiagn[oó]stic/i,
  /\bprescrib/i,
  /\bsuplemento/i,
  /\bmedicamento/i,
  /\bmetformina\b/i,
  /\binsulina\b/i,
  /\bantibi[oó]tic/i,
  /\bdebes\s+dejar\s+de\s+comer/i,
  /\bcambiar\s+tu\s+dieta\s+a/i,
  /\bayuno\s+intermitente/i,
  /\bdebes\s+hacer\s+ayuno/i,
  /\bsub(e|ir)\s+(tus\s+)?calor[ií]as/i,
  /\bbaj(a|ar)\s+(tus\s+)?calor[ií]as/i,
  /\bcastigo/i,
  /\beres\s+irresponsable/i,
  /\bfalta\s+de\s+disciplina/i,
];

const SCOLDING_PATTERNS: RegExp[] = [
  /\bdeber[ií]as\s+esforzarte\s+m[aá]s/i,
  /\bno\s+sigues\s+el\s+plan/i,
  /\bes\s+tu\s+culpa/i,
  /\bdejaste\s+de\s+cumplir/i,
];

export function hasForbiddenProgressLanguage(text: string): boolean {
  return FORBIDDEN_PATTERNS.some((p) => p.test(text));
}

export function hasScoldingProgressLanguage(text: string): boolean {
  return SCOLDING_PATTERNS.some((p) => p.test(text));
}

export function normalizeProgressAnalysisPayload(
  raw: Record<string, unknown>
): ProgressAiAnalysisPayload {
  const trendRaw = (raw.trend ?? {}) as Record<string, unknown>;
  const confidence = Number(raw.confidence);
  return {
    summary: String(raw.summary ?? "").trim() || "Análisis pendiente de revisión por nutrióloga.",
    trend: {
      weight: normalizeTrendDirection(trendRaw.weight),
      waist: normalizeTrendDirection(trendRaw.waist),
      abdomen: normalizeTrendDirection(trendRaw.abdomen),
      body_fat: normalizeTrendDirection(trendRaw.body_fat),
      muscle_mass: normalizeTrendDirection(trendRaw.muscle_mass),
    },
    observations: Array.isArray(raw.observations)
      ? raw.observations.map(String).filter(Boolean)
      : [],
    flags: Array.isArray(raw.flags) ? raw.flags.map(String).filter(Boolean) : [],
    questions_for_patient: Array.isArray(raw.questions_for_patient)
      ? raw.questions_for_patient.map(String).filter(Boolean)
      : [],
    suggested_review_points_for_nutritionist: Array.isArray(
      raw.suggested_review_points_for_nutritionist
    )
      ? raw.suggested_review_points_for_nutritionist.map(String).filter(Boolean)
      : [],
    requires_nutritionist_review: true,
    confidence: Number.isFinite(confidence) ? Math.min(1, Math.max(0, confidence)) : 0.5,
  };
}

export function applyProgressAnalysisGuardrails(
  payload: ProgressAiAnalysisPayload,
  options?: { measurementCount?: number }
): ProgressAiAnalysisPayload {
  let summary = payload.summary;
  let flags = [...payload.flags];
  let confidence = payload.confidence;
  let trend = { ...payload.trend };

  const measurementCount = options?.measurementCount ?? 0;
  if (measurementCount < 2) {
    flags = [...new Set([...flags, "insufficient_data"])];
    confidence = Math.min(confidence, 0.35);
    trend = {
      weight: trend.weight === "insufficient_data" ? trend.weight : "insufficient_data",
      waist: trend.waist === "insufficient_data" ? trend.waist : "insufficient_data",
      abdomen: trend.abdomen === "insufficient_data" ? trend.abdomen : "insufficient_data",
      body_fat: trend.body_fat === "insufficient_data" ? trend.body_fat : "insufficient_data",
      muscle_mass: trend.muscle_mass === "insufficient_data" ? trend.muscle_mass : "insufficient_data",
    };
  }

  const combined = [
    summary,
    ...payload.observations,
    ...payload.questions_for_patient,
    ...payload.suggested_review_points_for_nutritionist,
  ].join(" ");

  if (hasForbiddenProgressLanguage(combined)) {
    summary =
      "Se detectaron frases no permitidas en el análisis automático. Revisa manualmente las tendencias con tu nutrióloga.";
    return {
      ...payload,
      summary,
      trend,
      flags: [...new Set([...flags, "guardrail_corrected"])],
      requires_nutritionist_review: true,
      confidence: Math.min(confidence, 0.55),
    };
  }

  if (hasScoldingProgressLanguage(combined)) {
    summary = summary.replace(/deber[ií]as|culpa|irresponsable/gi, "conviene revisar");
    flags = [...new Set([...flags, "tone_softened"])];
    confidence = Math.min(confidence, 0.6);
  }

  return {
    ...payload,
    summary,
    trend,
    flags,
    requires_nutritionist_review: true,
    confidence: Math.min(confidence, 0.75),
  };
}
