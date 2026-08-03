import type { AiRequestContext, AiModeResult } from "../types";
import { PROMPT_VERSION } from "../config";
import { buildPrompt } from "../prompt-builder";
import { createClient } from "@/lib/supabase/server";

/**
 * Ollama queue provider — does NOT call Ollama directly.
 * Enqueues the task in `ai_jobs` for an external worker to process asynchronously.
 */
export async function runOllamaQueueTask(context: AiRequestContext): Promise<AiModeResult> {
  const promptText = buildPrompt(context.taskType, context.input);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_jobs")
    .insert({
      app: "equivalente",
      tipo: context.taskType,
      payload: {
        prompt: promptText
      },
      status: "pending",
      created_by: context.userId,
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    throw new Error(
      error?.message
        ? `No se pudo encolar la tarea de IA: ${error.message}`
        : "No se pudo encolar la tarea de IA."
    );
  }

  return {
    mode: "queued",
    jobId: data.id,
    taskType: context.taskType,
    metadata: {
      promptVersion: PROMPT_VERSION,
      provider: "ollama_queue",
      userId: context.userId,
      patientId: context.patientId,
    },
  };
}
