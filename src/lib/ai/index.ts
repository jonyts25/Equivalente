/**
 * Equivalente AI layer — public API.
 * Client-safe exports: types, prompt builder, response validator, config helpers (public only).
 * Server-only: runAiTask, providers, usage-guard (import paths directly on server).
 */

export type {
  AiProvider,
  AiTaskType,
  AiModeResult,
  AiRequestContext,
  PromptContext,
  ValidationResult,
  AiUsageReservation,
} from "./types";

export {
  getActiveProvider,
  isManualProvider,
  getChatGptUrl,
  PROMPT_VERSION,
} from "./config";

export { buildPrompt } from "./prompt-builder";
export { validateAiResponse, validateManualAiResponse } from "./response-validator";
export { TASK_SCHEMAS } from "./schemas";
export { TASK_CREDIT_COSTS, TASK_MAX_OUTPUT_TOKENS } from "./usage-guard";

// Server-only modules (documented — do not import from client):
// - ./provider-router (runAiTask)
// - ./providers/*
// - ./usage-guard (assertCanUseAi, reserveAiCredits, ...)
