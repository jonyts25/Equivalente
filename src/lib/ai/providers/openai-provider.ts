import type { AiRequestContext, AiModeResult } from "../types";
import {
  assertProviderConfig,
  getOpenAiConfig,
  isOpenAiEnabled,
} from "../config";
import { buildPrompt } from "../prompt-builder";
import { assertCanUseAi } from "../usage-guard";

/**
 * OpenAI API provider — prepared for future use.
 * Only executes when AI_PROVIDER=openai_api AND ENABLE_OPENAI_API=true.
 */
export async function runOpenAiTask(context: AiRequestContext): Promise<AiModeResult> {
  assertProviderConfig("openai_api");

  if (!isOpenAiEnabled()) {
    throw new Error(
      "OpenAI API no está habilitada. Configura AI_PROVIDER=openai_api y ENABLE_OPENAI_API=true."
    );
  }

  await assertCanUseAi({
    userId: context.userId,
    patientId: context.patientId,
    taskType: context.taskType,
    provider: "openai_api",
  });

  const config = getOpenAiConfig();
  if (!config) {
    throw new Error("Configuración de OpenAI incompleta.");
  }

  const promptText = buildPrompt(context.taskType, context.input);

  // TODO: integrate usage-guard reserve/finalize when OpenAI is activated
  void promptText;
  void config;

  throw new Error(
    "OpenAI API provider preparado pero no implementado todavía. Usa AI_PROVIDER=manual_chatgpt."
  );
}

/** Legacy helper — config only, server-side */
export function getOpenAiProviderConfig() {
  return getOpenAiConfig();
}
