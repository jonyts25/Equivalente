/**
 * @deprecated Use runAiTask from @/lib/ai/provider-router
 */
import { runAiTask } from "./provider-router";
import type { AiRequestContext, PromptContext } from "./types";

export interface AiRequest {
  task: AiRequestContext["taskType"];
  input: PromptContext;
  patientId?: string;
  userId: string;
  role?: AiRequestContext["role"];
}

export interface AiResponse {
  output: Record<string, unknown>;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  estimatedCostUsd?: number;
}

export async function generateWithAi(request: AiRequest): Promise<AiResponse> {
  const result = await runAiTask({
    userId: request.userId,
    patientId: request.patientId,
    role: request.role ?? "patient",
    taskType: request.task,
    input: request.input,
  });

  if (result.mode === "manual") {
    throw new Error(
      "El proveedor activo es manual_chatgpt. Usa copiar prompt y pegar respuesta."
    );
  }

  return {
    output: result.output as Record<string, unknown>,
    model: result.metadata?.model as string | undefined,
  };
}
