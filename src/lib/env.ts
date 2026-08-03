import {
  getActiveProvider,
  isManualProvider,
  isOpenAiEnabled,
  isOllamaEnabled,
} from "@/lib/ai/config";
import type { AiProvider } from "@/lib/ai/types";

export type { AiProvider };

/** @deprecated Use AiProvider / getActiveProvider() */
export type AiMode = AiProvider;

/** @deprecated Use getActiveProvider() */
export function getAiMode(): AiProvider {
  return getActiveProvider();
}

/** @deprecated Use isOpenAiEnabled() */
export function isOpenAiApiEnabled(): boolean {
  return isOpenAiEnabled();
}

export { isManualProvider, isOllamaEnabled, isOpenAiEnabled, getActiveProvider };

export function getSupabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
}

export function getSupabaseAnonKey(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
}

export function hasSupabaseConfig(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey());
}
