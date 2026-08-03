import type { AiProvider } from "./types";

const ALLOWED_PROVIDERS: AiProvider[] = [
  "manual_chatgpt",
  "ollama_local",
  "openai_api",
  "ollama_queue",
];

export function getActiveProvider(): AiProvider {
  const provider = process.env.AI_PROVIDER?.trim();
  if (provider && ALLOWED_PROVIDERS.includes(provider as AiProvider)) {
    return provider as AiProvider;
  }

  // Legacy: AI_MODE (deprecated, use AI_PROVIDER)
  const legacy = process.env.AI_MODE?.trim();
  if (legacy === "openai_api") return "openai_api";
  if (legacy === "manual_chatgpt") return "manual_chatgpt";

  return "manual_chatgpt";
}

export function isManualProvider(): boolean {
  return getActiveProvider() === "manual_chatgpt";
}

export function getChatGptUrl(): string {
  return process.env.NEXT_PUBLIC_CHATGPT_URL ?? "https://chatgpt.com";
}

export function assertProviderConfig(provider: AiProvider = getActiveProvider()): void {
  if (provider === "manual_chatgpt") return;
  if (provider === "ollama_queue") return;

  if (provider === "ollama_local") {
    if (!process.env.OLLAMA_BASE_URL?.trim()) {
      throw new Error("OLLAMA_BASE_URL es requerido cuando AI_PROVIDER=ollama_local");
    }
    if (!getOllamaModelFast()) {
      throw new Error("OLLAMA_MODEL_FAST (o OLLAMA_MODEL) es requerido cuando AI_PROVIDER=ollama_local");
    }
    return;
  }

  if (provider === "openai_api") {
    if (!process.env.OPENAI_API_KEY?.trim()) {
      throw new Error("OPENAI_API_KEY es requerido cuando AI_PROVIDER=openai_api");
    }
  }
}

export function isOllamaEnabled(): boolean {
  return getActiveProvider() === "ollama_local" && process.env.ENABLE_OLLAMA === "true";
}

export function isOpenAiEnabled(): boolean {
  return (
    getActiveProvider() === "openai_api" &&
    process.env.ENABLE_OPENAI_API === "true" &&
    Boolean(process.env.OPENAI_API_KEY?.trim())
  );
}

export function getOllamaConfig(): { baseUrl: string; model: string } | null {
  const baseUrl = getOllamaBaseUrl();
  const model = getOllamaModelFast();
  if (!baseUrl || !model) return null;
  return { baseUrl, model };
}

export function getOllamaBaseUrl(): string {
  return (process.env.OLLAMA_BASE_URL?.trim() ?? "http://localhost:11434").replace(/\/$/, "");
}

export function getOllamaTimeoutMs(): number {
  const ms = Number(process.env.OLLAMA_TIMEOUT_MS ?? 60000);
  return Number.isFinite(ms) && ms > 0 ? ms : 60000;
}

export function getOllamaModelFast(): string {
  return (
    process.env.OLLAMA_MODEL_FAST?.trim() ??
    process.env.OLLAMA_MODEL?.trim() ??
    "llama3.2:3b"
  );
}

export function getOllamaModelSpanish(): string {
  return process.env.OLLAMA_MODEL_SPANISH?.trim() ?? "gemma3:4b";
}

export function getOllamaModelSmart(): string {
  return process.env.OLLAMA_MODEL_SMART?.trim() ?? "qwen3.5:latest";
}

export function getOllamaEmbedModel(): string {
  return process.env.OLLAMA_EMBED_MODEL?.trim() ?? "nomic-embed-text:latest";
}

export function getOpenAiConfig(): {
  apiKey: string;
  defaultModel: string;
  strongModel: string;
  monthlyBudgetUsd: number;
  internalBudgetUsd: number;
} | null {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey || process.env.ENABLE_OPENAI_API !== "true") return null;

  return {
    apiKey,
    defaultModel: process.env.OPENAI_DEFAULT_MODEL ?? "gpt-4o-mini",
    strongModel: process.env.OPENAI_STRONG_MODEL ?? "gpt-4o",
    monthlyBudgetUsd: Number(process.env.OPENAI_MONTHLY_BUDGET_USD ?? 0),
    internalBudgetUsd: Number(process.env.APP_INTERNAL_AI_BUDGET_USD ?? 0),
  };
}

export const PROMPT_VERSION = "1.1.0";
