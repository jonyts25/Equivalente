import type { AiRequestContext, AiModeResult } from "../types";
import { PROMPT_VERSION } from "../config";
import { buildPrompt } from "../prompt-builder";

/**
 * Manual ChatGPT provider — no external API calls.
 * Returns prompt text for copy/paste workflow.
 */
export async function runManualChatGptTask(context: AiRequestContext): Promise<AiModeResult> {
  const promptText = buildPrompt(context.taskType, context.input);

  return {
    mode: "manual",
    promptText,
    taskType: context.taskType,
    metadata: {
      promptVersion: PROMPT_VERSION,
      provider: "manual_chatgpt",
      userId: context.userId,
      patientId: context.patientId,
    },
  };
}
