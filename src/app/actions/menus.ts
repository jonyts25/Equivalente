"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { buildPrompt, PROMPT_VERSION, validateAiResponse } from "@/lib/ai";
import { getActiveProviderForLogging } from "@/lib/ai/usage-guard";
import type { GenerationType, ManualAiTaskType, MenuStatus } from "@/types/database";

const TASK_TO_GENERATION: Partial<Record<ManualAiTaskType, GenerationType>> = {
  parse_diet: "parse_diet",
  generate_meal_options: "meal_options",
  generate_day_menu: "day_menu",
  generate_week_menu: "week_menu",
  craving_check: "craving",
  ingredients_menu: "ingredients",
  shopping_list: "shopping_list",
};

export async function saveManualAiSession(input: {
  patientId?: string;
  taskType: ManualAiTaskType;
  context: Record<string, string | number | undefined>;
  pastedResponse?: string;
  validationStatus?: string;
  parsedJson?: Record<string, unknown>;
  validationError?: string;
}) {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("No autenticado");

  const supabase = await createClient();
  const promptText = buildPrompt(input.taskType, input.context);

  const { data, error } = await supabase
    .from("manual_ai_sessions")
    .insert({
      patient_id: input.patientId ?? null,
      user_id: profile.id,
      task_type: input.taskType,
      prompt_text: promptText,
      pasted_response: input.pastedResponse ?? null,
      parsed_json: input.parsedJson ?? null,
      validation_status: input.validationStatus ?? "draft",
      validation_error: input.validationError ?? null,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  await supabase.from("ai_generation_logs").insert({
    patient_id: input.patientId ?? null,
    user_id: profile.id,
    task_type: input.taskType,
    provider: getActiveProviderForLogging(),
    prompt_version: PROMPT_VERSION,
    input_json: input.context,
    output_json: input.parsedJson ?? null,
    status: input.validationStatus ?? "draft",
  });

  return data;
}

export async function saveGeneratedMenu(input: {
  patientId: string;
  taskType: ManualAiTaskType;
  title: string;
  contentJson: Record<string, unknown>;
  explanation?: string;
  status?: MenuStatus;
  dietPlanId?: string;
  mealSlotId?: string;
}) {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("No autenticado");

  const generationType = TASK_TO_GENERATION[input.taskType];
  if (!generationType) throw new Error("Tipo de generación no soportado");

  const defaultStatus: MenuStatus =
    profile.role === "patient" ? "pending_review" : "draft";

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("generated_menus")
    .insert({
      patient_id: input.patientId,
      diet_plan_id: input.dietPlanId ?? null,
      meal_slot_id: input.mealSlotId ?? null,
      generation_type: generationType,
      title: input.title,
      content_json: input.contentJson,
      explanation: input.explanation ?? null,
      status: input.status ?? defaultStatus,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/paciente");
  revalidatePath("/nutriologo");
  return data;
}

export async function validateAndSaveMenu(input: {
  patientId: string;
  taskType: ManualAiTaskType;
  pastedResponse: string;
  title: string;
  context?: Record<string, string | number | undefined>;
  status?: MenuStatus;
}) {
  const result = validateAiResponse(input.taskType, input.pastedResponse);
  if (!result.valid || !result.data) {
    throw new Error(result.error ?? "Respuesta inválida");
  }

  await saveManualAiSession({
    patientId: input.patientId,
    taskType: input.taskType,
    context: input.context ?? {},
    pastedResponse: input.pastedResponse,
    validationStatus: "saved",
    parsedJson: result.data,
  });

  return saveGeneratedMenu({
    patientId: input.patientId,
    taskType: input.taskType,
    title: input.title,
    contentJson: result.data,
    status: input.status,
  });
}

export async function updateMenuStatus(menuId: string, status: MenuStatus, note?: string) {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("No autenticado");
  if (profile.role === "patient" && !["favorite", "patient_rejected"].includes(status)) {
    throw new Error("Paciente no puede aprobar clínicamente menús");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("generated_menus")
    .update({
      status,
      reviewed_by: ["approved", "rejected"].includes(status) ? profile.id : null,
      reviewed_at: ["approved", "rejected"].includes(status) ? new Date().toISOString() : null,
      explanation: note ?? undefined,
    })
    .eq("id", menuId);

  if (error) throw new Error(error.message);
  revalidatePath("/nutriologo");
  revalidatePath("/paciente");
}

export async function savePatientFeedback(input: {
  patientId: string;
  menuId?: string;
  feedbackType: string;
  comment?: string;
}) {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("No autenticado");

  const supabase = await createClient();
  const { error } = await supabase.from("patient_feedback").insert({
    patient_id: input.patientId,
    generated_menu_id: input.menuId ?? null,
    feedback_type: input.feedbackType,
    comment: input.comment ?? null,
  });

  if (error) throw new Error(error.message);
}
