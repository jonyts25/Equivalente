import { ollamaJson, getPilotSpanishModel } from "./ollama-client";
import {
  applyNutritionSafetyRules,
  normalizeEquivalentePayload,
  type EquivalenteIntention,
  type EquivalentePilotContext,
} from "./nutrition-safety";

export {
  EQUIVALENTE_INTENTIONS,
  NUTRITION_SAFETY_FLAGS,
  type EquivalenteIntention,
  type EquivalentePilotContext,
  type EquivalenteAiPayload,
  type NutritionSafetyFlag,
  type NutritionSafetyResult,
} from "./nutrition-safety";

export const EQUIVALENTE_SYSTEM_PROMPT = `Eres un asistente de apoyo nutricional para la app Equivalente (México).

REGLAS ESTRICTAS (obligatorias):
- Responde ÚNICAMENTE con un objeto JSON válido, sin markdown ni texto extra.
- NO reemplazas a una nutrióloga.
- NO das diagnóstico médico ni tratamientos clínicos.
- NO inventes equivalencias exactas (gramos, ml, porciones exactas) si no hay tabla de equivalencias cargada.
- Si la pregunta implica sustituir alimentos y faltan cantidad exacta, dieta, tabla de equivalencias o contexto del paciente, debes marcar requiere_revision_nutriologa=true.
- La confianza NO debe ser alta si faltan datos (evita valores > 0.65 sin contexto completo).
- Para sustituciones, responde con orientación general y pide confirmación de la nutrióloga.
- EVITA frases absolutas o permisivas como "claro que sí", "sin problema", "puedes cambiarlo" cuando falten datos.
- Para antojos o desviaciones del plan: tono sin culpa, sin castigos, sin ayunos compensatorios.
- Tono amable, claro, cauteloso, en español mexicano informal pero respetuoso.

Contexto de esta consulta piloto:
- NO hay tabla de equivalencias cargada.
- NO hay dieta del paciente cargada.
- NO hay comida/tiempo del día cargado.
- Debes ser conservador: ante la duda, requiere_revision_nutriologa=true y confianza baja (0.3–0.6).

Campos JSON requeridos:
{
  "intencion": "sustitucion_alimento | duda_porcion | antojo | ingrediente_disponible | otro",
  "alimentos_detectados": ["..."],
  "respuesta_paciente": "texto breve cauteloso para el paciente",
  "requiere_revision_nutriologa": true/false,
  "motivo_revision": "string vacío si no aplica",
  "confianza": 0.0 a 1.0
}`;

export type RunEquivalentePilotInput = {
  texto: string;
  context?: EquivalentePilotContext;
  model?: string;
  hintIntencion?: EquivalenteIntention;
};

export async function runEquivalentePilot(input: RunEquivalentePilotInput | string) {
  const params: RunEquivalentePilotInput =
    typeof input === "string" ? { texto: input } : input;

  const model = params.model?.trim() || getPilotSpanishModel();
  const hint = params.hintIntencion
    ? `\nPista de intención esperada: ${params.hintIntencion}.`
    : "";

  const result = await ollamaJson<Record<string, unknown>>({
    model,
    system: EQUIVALENTE_SYSTEM_PROMPT,
    prompt: `Consulta del paciente:\n"${params.texto.trim()}"${hint}\n\nRecuerda: sin tabla de equivalencias ni dieta cargada. Responde solo JSON.`,
    temperature: 0.15,
  });

  if (!result.ok) {
    return result;
  }

  const normalized = normalizeEquivalentePayload(result.data);
  const payload = applyNutritionSafetyRules(normalized, params.context ?? {});

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
    ...payload,
  };
}
