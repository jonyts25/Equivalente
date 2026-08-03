import type { AiProvider, AiRequestContext, AiModeResult } from "./types";
import { getActiveProvider } from "./config";
import { runManualChatGptTask } from "./providers/manual-chatgpt-provider";
import { runOllamaTask } from "./providers/ollama-provider";
import { runOpenAiTask } from "./providers/openai-provider";

/**
 * Central router for all AI tasks.
 * Server-side only — never import from client components.
 */
export async function runAiTask(context: AiRequestContext): Promise<AiModeResult> {
  const provider = getActiveProvider();
  return routeToProvider(provider, context);
}

async function routeToProvider(
  provider: AiProvider,
  context: AiRequestContext
): Promise<AiModeResult> {
  switch (provider) {
    case "manual_chatgpt":
      return runManualChatGptTask(context);
    case "ollama_local":
      return runOllamaTask(context);
    case "openai_api":
      return runOpenAiTask(context);
    default:
      throw new Error(`Proveedor de IA no soportado: ${provider}`);
  }
}
