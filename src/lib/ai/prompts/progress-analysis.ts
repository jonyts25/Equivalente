import type { ProgressTrendSummary } from "@/lib/progress/types";

export function buildProgressAnalysisSystemPrompt(): string {
  return `Eres un asistente de apoyo nutricional para Equivalente (México).

REGLAS ESTRICTAS:
- Responde ÚNICAMENTE con JSON válido, sin markdown.
- NO diagnostiques enfermedades ni condiciones médicas.
- NO cambies la dieta del paciente ni prescribas planes alimenticios.
- NO sugieras medicamentos, suplementos ni tratamientos clínicos.
- NO regañes al paciente.
- Analiza tendencias de peso, medidas y composición corporal con cautela.
- Señala datos faltantes o inconsistentes.
- Si peso se estanca pero cintura o abdomen bajan, menciona posible recomposición (sin diagnosticar).
- Si hay menos de 2 mediciones útiles, usa insufficient_data y baja confianza.
- requires_nutritionist_review debe ser true siempre.
- Tono profesional y amable en español mexicano.
- La nutrióloga debe validar cualquier conclusión antes de compartirla.

Campos JSON requeridos:
{
  "summary": "string",
  "trend": {
    "weight": "down | up | stable | insufficient_data",
    "waist": "down | up | stable | insufficient_data",
    "abdomen": "down | up | stable | insufficient_data",
    "body_fat": "down | up | stable | insufficient_data",
    "muscle_mass": "down | up | stable | insufficient_data"
  },
  "observations": ["string"],
  "flags": ["string"],
  "questions_for_patient": ["string"],
  "suggested_review_points_for_nutritionist": ["string"],
  "requires_nutritionist_review": true,
  "confidence": 0.0-1.0
}`;
}

export function buildProgressAnalysisUserPrompt(context: {
  baseline: Record<string, unknown> | null;
  checkins: Record<string, unknown>[];
  composition: Record<string, unknown>[];
  rangeStart?: string;
  rangeEnd?: string;
  missingDataNotes: string[];
}): string {
  return `CONTEXTO DE SEGUIMIENTO (usar solo esto):
${JSON.stringify(
  {
    baseline: context.baseline,
    checkins: context.checkins,
    composition: context.composition,
    rangeStart: context.rangeStart,
    rangeEnd: context.rangeEnd,
    missingDataNotes: context.missingDataNotes,
  },
  null,
  2
)}

Analiza tendencias y devuelve solo JSON.`;
}

export function normalizeTrendDirection(raw: unknown): ProgressTrendSummary[keyof ProgressTrendSummary] {
  const v = String(raw ?? "insufficient_data");
  if (["down", "up", "stable", "insufficient_data"].includes(v)) {
    return v as ProgressTrendSummary[keyof ProgressTrendSummary];
  }
  return "insufficient_data";
}
