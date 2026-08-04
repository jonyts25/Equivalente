import type { AiRequestContext, AiModeResult } from "../types";
import { PROMPT_VERSION } from "../config";
import { buildPrompt } from "../prompt-builder";
import {
  buildSingleWeekDayPrompt,
  WEEK_DAY_LABELS,
  type WeekMenuContext,
} from "../prompts/generate-week-menu";
import { createClient } from "@/lib/supabase/server";

function weekMenuContextFromInput(
  input: AiRequestContext["input"]
): WeekMenuContext {
  return {
    patientName: String(input.patientName ?? "Paciente"),
    dietSummary: String(input.dietSummary ?? ""),
    equivalences: String(input.equivalences ?? ""),
    restrictions: String(input.restrictions ?? ""),
    preferences: String(input.preferences ?? ""),
    forbiddenFoods: String(input.forbiddenFoods ?? ""),
    triggerFoods: String(input.triggerFoods ?? ""),
    forbiddenTreats: String(input.forbiddenTreats ?? ""),
    precisionMode: String(input.precisionMode ?? "normal"),
  };
}

function buildWeekMenuDayPrompts(input: AiRequestContext["input"]) {
  const ctx = weekMenuContextFromInput(input);
  return WEEK_DAY_LABELS.map((dayLabel, index) => {
    const dayNumber = index + 1;
    return {
      day_number: dayNumber,
      day_label: dayLabel,
      prompt: buildSingleWeekDayPrompt(ctx, dayNumber, dayLabel),
    };
  });
}

/**
 * Ollama queue provider — does NOT call Ollama directly.
 * Enqueues the task in `ai_jobs` for an external worker to process asynchronously.
 */
export async function runOllamaQueueTask(context: AiRequestContext): Promise<AiModeResult> {
  const payload =
    context.taskType === "generate_week_menu"
      ? { dayPrompts: buildWeekMenuDayPrompts(context.input) }
      : { prompt: buildPrompt(context.taskType, context.input) };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_jobs")
    .insert({
      app: "equivalente",
      tipo: context.taskType,
      payload,
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
