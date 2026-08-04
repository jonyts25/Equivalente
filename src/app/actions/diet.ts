"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { getNutritionistByProfileId } from "@/lib/data/patient-context";
import { validateAiResponse } from "@/lib/ai";
import { saveManualAiSession } from "@/app/actions/menus";

export async function saveDietPlan(input: {
  patientId: string;
  title: string;
  rawText: string;
  structuredJson?: Record<string, unknown>;
}) {
  const profile = await getCurrentProfile();
  if (!profile || !["admin", "nutritionist"].includes(profile.role)) {
    throw new Error("No autorizado");
  }

  const supabase = await createClient();

  await supabase
    .from("diet_plans")
    .update({ status: "archived" })
    .eq("patient_id", input.patientId)
    .eq("status", "active");

  const { data: plan, error } = await supabase
    .from("diet_plans")
    .insert({
      patient_id: input.patientId,
      title: input.title,
      raw_text: input.rawText,
      status: "active",
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  if (input.structuredJson?.meal_slots && Array.isArray(input.structuredJson.meal_slots)) {
    for (const slot of input.structuredJson.meal_slots as Array<{
      name: string;
      slot_order: number;
      notes?: string;
      requirements?: Record<string, unknown>;
    }>) {
      const { data: mealSlot } = await supabase
        .from("meal_slots")
        .insert({
          diet_plan_id: plan.id,
          name: slot.name,
          slot_order: slot.slot_order,
          notes: slot.notes ?? null,
        })
        .select("id")
        .single();

      if (mealSlot && slot.requirements) {
        await supabase.from("meal_requirements").insert({
          meal_slot_id: mealSlot.id,
          ...slot.requirements,
        });
      }
    }
  }

  revalidatePath(`/nutriologo/pacientes/${input.patientId}/dieta`);
  return plan;
}

export async function parseAndSaveDiet(input: {
  patientId: string;
  rawText: string;
  pastedResponse: string;
}) {
  const result = validateAiResponse("parse_diet", input.pastedResponse);
  if (!result.valid || !result.data) {
    throw new Error(result.error ?? "Respuesta inválida");
  }

  await saveManualAiSession({
    patientId: input.patientId,
    taskType: "parse_diet",
    context: { rawDiet: input.rawText },
    pastedResponse: input.pastedResponse,
    validationStatus: "saved",
    parsedJson: result.data,
  });

  const title = String(result.data.title ?? "Dieta estructurada");
  return saveDietPlan({
    patientId: input.patientId,
    title,
    rawText: input.rawText,
    structuredJson: result.data,
  });
}

export async function saveEquivalenceGroup(input: {
  patientId?: string;
  name: string;
  category: string;
  notes?: string;
}) {
  const profile = await getCurrentProfile();
  if (!profile || !["admin", "nutritionist"].includes(profile.role)) {
    throw new Error("No autorizado");
  }

  const supabase = await createClient();
  const nutritionist = await getNutritionistByProfileId(profile.id);
  if (!nutritionist) {
    throw new Error("No hay registro de nutrióloga vinculado a tu cuenta.");
  }

  const { data, error } = await supabase
    .from("equivalence_groups")
    .insert({
      patient_id: input.patientId ?? null,
      nutritionist_id: nutritionist.id,
      name: input.name,
      category: input.category,
      notes: input.notes ?? null,
      active: true,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  if (input.patientId) {
    revalidatePath(`/nutriologo/pacientes/${input.patientId}/equivalencias`);
  }
  revalidatePath("/nutriologo/equivalencias");
  return data;
}

export async function saveForbiddenTreat(input: {
  patientId: string;
  name: string;
  mode: string;
  triggerRisk?: number;
  reason?: string;
}) {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("No autenticado");

  const supabase = await createClient();
  const { error } = await supabase.from("forbidden_treats").insert({
    patient_id: input.patientId,
    name: input.name,
    mode: input.mode,
    trigger_risk: input.triggerRisk ?? 3,
    reason: input.reason ?? null,
    ambiguity_required: true,
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/nutriologo/pacientes/${input.patientId}/gustos-prohibidos`);
  revalidatePath(`/paciente/gustos-prohibidos`);
}
