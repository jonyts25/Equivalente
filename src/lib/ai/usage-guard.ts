/**
 * AI usage guard — monetization & limits (future).
 * Server-side only.
 *
 * In manual_chatgpt mode: no credit checks, always allows.
 * In ollama_local / openai_api: validates plan, credits, daily/weekly limits before provider call.
 */

import type { AiProvider, AiTaskType, AiUsageReservation } from "./types";
import { getActiveProvider, isManualProvider } from "./config";

/** Default credit cost per task (commercial credits, not tokens) */
export const TASK_CREDIT_COSTS: Record<AiTaskType, number> = {
  craving_check: 1,
  generate_meal_options: 2,
  ingredients_menu: 2,
  generate_day_menu: 5,
  shopping_list: 5,
  generate_week_menu: 20,
  parse_diet: 25,
};

export const TASK_MAX_OUTPUT_TOKENS: Partial<Record<AiTaskType, number>> = {
  craving_check: 700,
  generate_meal_options: 1800,
  generate_day_menu: 3500,
  generate_week_menu: 8000,
  parse_diet: 3500,
  shopping_list: 2000,
  ingredients_menu: 1800,
};

export interface AssertCanUseAiInput {
  userId: string;
  patientId?: string;
  nutritionistId?: string;
  taskType: AiTaskType;
  provider: AiProvider;
}

export async function assertCanUseAi(input: AssertCanUseAiInput): Promise<void> {
  if (isManualProvider() || input.provider === "manual_chatgpt") {
    return;
  }

  // TODO: query subscription_plans, customer_subscriptions, ai_credit_balances
  // TODO: validate ai_enabled, credits_remaining, max_daily_ai_requests, max_weekly_menu_generations
  void input;
  throw new Error(
    "Uso de IA automática no disponible todavía. Activa un plan con créditos o usa AI_PROVIDER=manual_chatgpt."
  );
}

export async function reserveAiCredits(input: {
  patientId?: string;
  nutritionistId?: string;
  taskType: AiTaskType;
  provider: AiProvider;
}): Promise<AiUsageReservation | null> {
  if (isManualProvider() || input.provider === "manual_chatgpt") {
    return null;
  }

  const credits = TASK_CREDIT_COSTS[input.taskType] ?? 1;

  // TODO: atomic reserve in ai_credit_balances + insert ai_credit_transactions (pending)
  return {
    id: crypto.randomUUID(),
    patientId: input.patientId,
    nutritionistId: input.nutritionistId,
    taskType: input.taskType,
    provider: input.provider,
    creditsReserved: credits,
  };
}

export async function finalizeAiUsage(input: {
  reservationId?: string;
  aiGenerationLogId?: string;
  actualInputTokens?: number;
  actualOutputTokens?: number;
  estimatedCostUsd?: number;
}): Promise<void> {
  if (!input.reservationId) return;

  // TODO: commit credit deduction, link ai_generation_log_id
  void input;
}

export async function releaseAiReservation(input: {
  reservationId?: string;
  reason: string;
}): Promise<void> {
  if (!input.reservationId) return;

  // TODO: release reserved credits on provider failure
  void input;
}

export function getActiveProviderForLogging(): AiProvider {
  return getActiveProvider();
}
