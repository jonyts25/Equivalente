import { ollamaJson, getPilotSpanishModel } from "./ollama-client";
import {
  applyProgressAnalysisGuardrails,
  normalizeProgressAnalysisPayload,
} from "./progress-analysis-guardrails";
import {
  buildProgressAnalysisSystemPrompt,
  buildProgressAnalysisUserPrompt,
} from "./prompts/progress-analysis";
import type { PatientBaselineProfile } from "@/lib/progress/types";
import type { NutritionCheckin, BodyCompositionEntry } from "@/lib/progress/types";

const MAX_CHECKINS = 12;
const MAX_COMPOSITION = 8;

export type ProgressAnalysisContext = {
  baseline: PatientBaselineProfile | null;
  checkins: NutritionCheckin[];
  composition: BodyCompositionEntry[];
  rangeStart?: string;
  rangeEnd?: string;
};

export function buildProgressAnalysisContext(input: ProgressAnalysisContext) {
  const checkins = input.checkins.slice(0, MAX_CHECKINS).map((c) => ({
    date: c.checkin_date,
    weight_kg: c.weight_kg,
    waist_cm: c.waist_cm,
    chest_cm: c.chest_cm,
    abdomen_cm: c.abdomen_cm,
    hip_cm: c.hip_cm,
    diet_label: c.diet_label,
  }));

  const composition = input.composition.slice(0, MAX_COMPOSITION).map((e) => ({
    date: e.measured_at,
    weight_kg: e.weight_kg,
    body_fat_percent: e.body_fat_percent,
    muscle_mass_kg: e.muscle_mass_kg,
    water_percent: e.water_percent,
    visceral_fat: e.visceral_fat,
    metabolic_age: e.metabolic_age,
  }));

  const missing: string[] = [];
  if (checkins.length < 2) missing.push("Pocos check-ins antropométricos para tendencias.");
  if (composition.length === 0) missing.push("Sin registros de composición corporal.");
  if (!input.baseline?.height_cm) missing.push("Falta talla en perfil base.");
  if (!input.baseline?.initial_weight_kg && checkins.every((c) => c.weight_kg == null)) {
    missing.push("Falta peso inicial o registros de peso.");
  }

  return {
    baseline: input.baseline
      ? {
          height_cm: input.baseline.height_cm,
          initial_weight_kg: input.baseline.initial_weight_kg,
          ideal_weight_kg: input.baseline.ideal_weight_kg,
          body_distribution: input.baseline.body_distribution,
        }
      : null,
    checkins,
    composition,
    rangeStart: input.rangeStart,
    rangeEnd: input.rangeEnd,
    missingDataNotes: missing,
  };
}

export async function runProgressAnalysisPilot(input: {
  context: ProgressAnalysisContext;
  model?: string;
}) {
  const built = buildProgressAnalysisContext(input.context);
  const model = input.model?.trim() || getPilotSpanishModel();

  const result = await ollamaJson<Record<string, unknown>>({
    model,
    system: buildProgressAnalysisSystemPrompt(),
    prompt: buildProgressAnalysisUserPrompt(built),
    temperature: 0.1,
  });

  if (!result.ok) {
    return result;
  }

  const payload = applyProgressAnalysisGuardrails(
    normalizeProgressAnalysisPayload(result.data),
    { measurementCount: built.checkins.length }
  );

  return {
    ok: true as const,
    model: result.model,
    rawContent: result.content,
    payload,
    contextPreview: built,
  };
}
