"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/session";
import {
  buildEquivalenteNutritionContext,
  listDietPlansForPatient,
  listMealSlotsForDiet,
  summarizeContextForClient,
} from "@/lib/ai/equivalente-context";
import { assertContextualAiAccess } from "@/lib/ai/contextual-ai-access";
import {
  assertNotAutoApproved,
  buildContextualDraftContentJson,
  buildContextualDraftTitle,
  mapIntentionToGenerationType,
  resolveContextualDraftStatus,
  type ContextualAiDraftPayload,
  type ContextualSaveKind,
} from "@/lib/ai/contextual-draft";
import { createClient } from "@/lib/supabase/server";
import { getNutritionistByProfileId } from "@/lib/data/patient-context";
import type { MenuStatus } from "@/types/database";

export async function listPatientsForIaPanel() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role === "patient") {
    throw new Error("No autorizado");
  }

  const supabase = await createClient();

  if (profile.role === "admin") {
    const { data, error } = await supabase
      .from("patients")
      .select("id, full_name, precision_mode, active")
      .eq("active", true)
      .order("full_name");
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  const nutritionist = await getNutritionistByProfileId(profile.id);
  if (!nutritionist) return [];

  const { data, error } = await supabase
    .from("patients")
    .select("id, full_name, precision_mode, active")
    .eq("nutritionist_id", nutritionist.id)
    .eq("active", true)
    .order("full_name");

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getIaPanelDietPlans(patientId: string) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role === "patient") throw new Error("No autorizado");
  return listDietPlansForPatient(patientId);
}

export async function getIaPanelMealSlots(dietPlanId: string) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role === "patient") throw new Error("No autorizado");
  return listMealSlotsForDiet(dietPlanId);
}

export async function previewIaContext(input: {
  patientId: string;
  dietPlanId?: string;
  mealSlotId?: string;
}) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role === "patient") throw new Error("No autorizado");

  const ctx = await buildEquivalenteNutritionContext(input);
  if (!ctx) throw new Error("Paciente no encontrado");

  return {
    contextCompleteness: ctx.contextCompleteness,
    contexto: summarizeContextForClient(ctx),
  };
}

export async function saveContextualAiDraft(input: {
  patientId: string;
  dietPlanId?: string;
  mealSlotId?: string;
  saveKind: ContextualSaveKind;
  preguntaOriginal: string;
  aiResponse: ContextualAiDraftPayload;
}) {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("No autenticado");
  if (profile.role === "patient") {
    throw new Error("Pacientes no pueden guardar borradores de IA local.");
  }

  const access = await assertContextualAiAccess(input.patientId);
  if (!access.ok) throw new Error(access.error);

  const intencion = input.aiResponse.intencion ?? "otro";
  const status = resolveContextualDraftStatus(input.saveKind);
  assertNotAutoApproved(status);

  const generationType = mapIntentionToGenerationType(intencion);
  const title = buildContextualDraftTitle(
    input.preguntaOriginal,
    intencion,
    input.saveKind
  );
  const contentJson = buildContextualDraftContentJson({
    saveKind: input.saveKind,
    preguntaOriginal: input.preguntaOriginal,
    aiResponse: input.aiResponse,
    includeDebug: access.role === "admin",
  });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("generated_menus")
    .insert({
      patient_id: input.patientId,
      diet_plan_id: input.dietPlanId ?? null,
      meal_slot_id: input.mealSlotId ?? null,
      generation_type: generationType,
      title,
      content_json: contentJson,
      explanation: input.aiResponse.respuesta_paciente ?? null,
      status,
      created_by: profile.id,
    })
    .select("id, status")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath(`/nutriologo/pacientes/${input.patientId}/menus`);
  revalidatePath("/nutriologo/ia-local");
  revalidatePath("/admin/ia-local");
  revalidatePath("/paciente/opciones");

  return { id: data.id, status: data.status as MenuStatus };
}

export async function deleteContextualAiDraft(menuId: string, patientId: string) {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("No autenticado");
  if (profile.role === "patient") {
    throw new Error("Pacientes no pueden eliminar borradores de IA local.");
  }

  const access = await assertContextualAiAccess(patientId);
  if (!access.ok) throw new Error(access.error);

  const supabase = await createClient();
  const { data: menu, error: fetchError } = await supabase
    .from("generated_menus")
    .select("id, patient_id, content_json")
    .eq("id", menuId)
    .eq("patient_id", patientId)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);
  if (!menu) throw new Error("Borrador no encontrado.");

  const content = menu.content_json as Record<string, unknown>;
  if (content?.source !== "ollama_local_contextual") {
    throw new Error("Solo se pueden eliminar borradores de IA local contextual desde este flujo.");
  }

  const { error } = await supabase.from("generated_menus").delete().eq("id", menuId);
  if (error) throw new Error(error.message);

  revalidatePath(`/nutriologo/pacientes/${patientId}/menus`);
  revalidatePath("/paciente/opciones");
}
