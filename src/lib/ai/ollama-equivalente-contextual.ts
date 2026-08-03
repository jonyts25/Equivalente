import { ollamaJson, getPilotSpanishModel } from "./ollama-client";
import {
  buildEquivalenteNutritionContext,
  summarizeContextForClient,
  type EquivalenteNutritionContext,
} from "./equivalente-context";
import {
  applyNutritionSafetyRules,
  normalizeEquivalentePayload,
  type EquivalenteIntention,
  type EquivalentePilotContext,
  type NutritionSafetyFlag,
} from "./nutrition-safety";
import {
  buildEquivalenteContextualSystemPrompt,
  buildEquivalenteContextualUserPrompt,
  detectForbiddenTreatInQuestion,
  toPilotSafetyContext,
} from "./prompts/equivalente-contextual";

export type RunEquivalenteContextualInput = {
  patientId: string;
  texto: string;
  dietPlanId?: string;
  mealSlotId?: string;
  model?: string;
  hintIntencion?: EquivalenteIntention;
};

export async function runEquivalenteContextualPilot(
  input: RunEquivalenteContextualInput
) {
  const nutritionContext = await buildEquivalenteNutritionContext({
    patientId: input.patientId,
    dietPlanId: input.dietPlanId,
    mealSlotId: input.mealSlotId,
  });

  if (!nutritionContext) {
    return {
      ok: false as const,
      error: "PATIENT_NOT_FOUND" as const,
      message: "Paciente no encontrado o sin acceso.",
    };
  }

  return runEquivalenteContextualWithContext({
    ...input,
    nutritionContext,
  });
}

export async function runEquivalenteContextualWithContext(input: {
  texto: string;
  nutritionContext: EquivalenteNutritionContext;
  model?: string;
  hintIntencion?: EquivalenteIntention;
}) {
  const { nutritionContext, texto } = input;
  const model = input.model?.trim() || getPilotSpanishModel();
  const safetyContext: EquivalentePilotContext = toPilotSafetyContext(
    nutritionContext,
    texto
  );

  const result = await ollamaJson<Record<string, unknown>>({
    model,
    system: buildEquivalenteContextualSystemPrompt(nutritionContext),
    prompt: buildEquivalenteContextualUserPrompt(
      nutritionContext,
      texto,
      input.hintIntencion
    ),
    temperature: 0.15,
  });

  if (!result.ok) {
    return result;
  }

  let payload = applyNutritionSafetyRules(
    normalizeEquivalentePayload(result.data),
    safetyContext
  );

  const forbiddenMatch = detectForbiddenTreatInQuestion(nutritionContext, texto);
  if (forbiddenMatch && input.hintIntencion === "antojo") {
    const extraFlags: NutritionSafetyFlag[] = payload.flags.includes(
      "requires_professional_review"
    )
      ? []
      : ["requires_professional_review"];
    payload = {
      ...payload,
      requiere_revision_nutriologa: true,
      confianza: Math.min(payload.confianza, 0.6),
      motivo_revision:
        payload.motivo_revision ||
        `Antojo de "${forbiddenMatch}" registrado como gusto prohibido; requiere revisión de porción y plan.`,
      flags: [...new Set([...payload.flags, ...extraFlags])],
    };
  }

  if (!payload.respuesta_paciente) {
    return {
      ok: false as const,
      error: "INVALID_JSON" as const,
      rawPreview: result.content.slice(0, 500),
      message: "JSON recibido pero respuesta_paciente vacía.",
    };
  }

  return {
    ok: true as const,
    model: result.model,
    rawContent: result.content,
    contextCompleteness: nutritionContext.contextCompleteness,
    contexto: summarizeContextForClient(nutritionContext),
    ...payload,
  };
}
