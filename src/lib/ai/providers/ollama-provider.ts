import type { AiRequestContext, AiModeResult } from "../types";
import { assertProviderConfig, getOllamaConfig, isOllamaEnabled, PROMPT_VERSION } from "../config";
import { buildPrompt } from "../prompt-builder";
import { assertCanUseAi } from "../usage-guard";

function parseOllamaJsonContent(content: string): unknown {
  const trimmed = content.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonText = fenceMatch ? fenceMatch[1].trim() : trimmed;
  return JSON.parse(jsonText);
}

/**
 * Ollama local provider — prepared for future use.
 * Uses Ollama POST /api/chat (non-streaming).
 * Only executes when AI_PROVIDER=ollama_local AND ENABLE_OLLAMA=true.
 */
export async function runOllamaTask(context: AiRequestContext): Promise<AiModeResult> {
  assertProviderConfig("ollama_local");

  if (!isOllamaEnabled()) {
    throw new Error(
      "Ollama no está habilitado. Configura AI_PROVIDER=ollama_local y ENABLE_OLLAMA=true."
    );
  }

  await assertCanUseAi({
    userId: context.userId,
    patientId: context.patientId,
    taskType: context.taskType,
    provider: "ollama_local",
  });

  const config = getOllamaConfig();
  if (!config) {
    throw new Error("Configuración de Ollama incompleta.");
  }

  const promptText = buildPrompt(context.taskType, context.input);

  let response: Response;
  try {
    response = await fetch(`${config.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config.model,
        stream: false,
        messages: [
          {
            role: "system",
            content:
              "Eres un asistente nutricional para Equivalente. Responde SOLO con JSON válido, sin markdown ni texto adicional.",
          },
          { role: "user", content: promptText },
        ],
        format: "json",
      }),
    });
  } catch {
    throw new Error(
      "No se pudo conectar con Ollama. Verifica que tu PC esté prendida y que Ollama esté corriendo."
    );
  }

  if (!response.ok) {
    throw new Error(
      `Ollama respondió con error ${response.status}. Verifica OLLAMA_BASE_URL y OLLAMA_MODEL.`
    );
  }

  const body = (await response.json()) as { message?: { content?: string } };
  const content = body.message?.content;
  if (!content) {
    throw new Error("Ollama no devolvió contenido en la respuesta.");
  }

  let output: unknown;
  try {
    output = parseOllamaJsonContent(content);
  } catch {
    throw new Error("No se pudo parsear JSON de la respuesta de Ollama.");
  }

  return {
    mode: "automatic",
    output,
    taskType: context.taskType,
    provider: "ollama_local",
    metadata: {
      promptVersion: PROMPT_VERSION,
      model: config.model,
      userId: context.userId,
      patientId: context.patientId,
    },
  };
}
