import type { AiTaskType, ValidationResult } from "./types";
import { TASK_SCHEMAS } from "./schemas";

function extractJson(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) return fenceMatch[1].trim();
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }
  return trimmed;
}

export function validateAiResponse(task: AiTaskType, pastedResponse: string): ValidationResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJson(pastedResponse));
  } catch {
    return {
      valid: false,
      error:
        "No pude leer bien la respuesta. Intenta copiar el bloque completo de ChatGPT o vuelve a generar el prompt.",
    };
  }

  const schema = TASK_SCHEMAS[task];
  if (!schema) {
    return { valid: false, error: "Tarea de validación no soportada." };
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    return {
      valid: false,
      error:
        "No pude leer bien la respuesta. Intenta copiar el bloque completo de ChatGPT o vuelve a generar el prompt.",
    };
  }

  return { valid: true, data: result.data as Record<string, unknown> };
}

/** @deprecated Use validateAiResponse */
export const validateManualAiResponse = validateAiResponse;
