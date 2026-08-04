import { createClient } from "@/lib/supabase/server";
import {
  getActiveNutritionistsByProfileId,
  getActivePatientsByProfileId,
  pickActiveRecord,
} from "@/lib/auth/context";

export async function getPatientPromptContext(patientId: string) {
  const supabase = await createClient();

  const { data: patient } = await supabase
    .from("patients")
    .select("*")
    .eq("id", patientId)
    .single();

  const { data: dietPlan } = await supabase
    .from("diet_plans")
    .select("*, meal_slots(*, meal_requirements(*))")
    .eq("patient_id", patientId)
    .eq("status", "active")
    .maybeSingle();

  // Equivalencias generales de la nutrióloga (patient_id null), no por paciente.
  let equivalences: Array<{
    name: string;
    equivalence_items: Array<{ portion_label: string; food_items: { name: string } }> | null;
  }> | null = null;

  if (patient?.nutritionist_id) {
    const { data } = await supabase
      .from("equivalence_groups")
      .select("*, equivalence_items(*, food_items(name))")
      .eq("nutritionist_id", patient.nutritionist_id)
      .is("patient_id", null)
      .eq("active", true);
    equivalences = data;
  }

  const { data: preferences } = await supabase
    .from("patient_food_preferences")
    .select("*")
    .eq("patient_id", patientId);

  const { data: forbiddenTreats } = await supabase
    .from("forbidden_treats")
    .select("*")
    .eq("patient_id", patientId);

  const mealSlots = Array.isArray(dietPlan?.meal_slots) ? dietPlan.meal_slots : [];
  const dietSummary = dietPlan
    ? [
        dietPlan.title,
        dietPlan.raw_text ?? "",
        mealSlots.length > 0 ? JSON.stringify(mealSlots, null, 2) : null,
      ]
        .filter((part) => part != null && String(part).trim() !== "")
        .join("\n")
    : "Sin dieta activa configurada.";

  const equivText =
    equivalences
      ?.map(
        (g) =>
          `${g.name}: ${(g.equivalence_items as Array<{ portion_label: string; food_items: { name: string } }>)?.map((i) => `${i.food_items?.name} (${i.portion_label})`).join(", ")}`
      )
      .join("\n") ?? "Sin equivalencias personalizadas.";

  const prefs = preferences ?? [];
  const restrictions = prefs
    .filter((p) => p.preference === "clinical_ban")
    .map((p) => p.custom_food_name ?? p.food_item_id)
    .join(", ");
  const loves = prefs
    .filter((p) => p.preference === "love")
    .map((p) => p.custom_food_name ?? p.food_item_id)
    .join(", ");
  const triggers = prefs
    .filter((p) => p.preference === "trigger")
    .map((p) => p.custom_food_name ?? p.food_item_id)
    .join(", ");
  const treats =
    forbiddenTreats?.map((t) => `${t.name} (${t.mode})`).join(", ") ??
    "Sin gustos prohibidos registrados.";

  return {
    patient,
    dietPlan,
    dietTitle: dietPlan?.title ?? null,
    patientName: patient?.full_name ?? "Paciente",
    precisionMode: patient?.precision_mode ?? "normal",
    dietSummary,
    equivalences: equivText,
    restrictions: restrictions || "Ninguna registrada.",
    preferences: loves || "Sin preferencias registradas.",
    forbiddenFoods: restrictions || "Ninguno.",
    triggerFoods: triggers || "Ninguno.",
    forbiddenTreats: treats,
  };
}

export async function getActivePatientByProfileId(profileId: string) {
  const supabase = await createClient();
  const { data, error } = await getActivePatientsByProfileId(supabase, profileId);
  if (error) return null;
  return pickActiveRecord(data ?? [], "patient");
}

export async function getActiveNutritionistByProfileId(profileId: string) {
  const supabase = await createClient();
  const { data, error } = await getActiveNutritionistsByProfileId(supabase, profileId);
  if (error) return null;
  return pickActiveRecord(data ?? [], "nutritionist");
}

/** @deprecated Use getActivePatientByProfileId */
export async function getPatientByProfileId(profileId: string) {
  return getActivePatientByProfileId(profileId);
}

/** @deprecated Use getActiveNutritionistByProfileId */
export async function getNutritionistByProfileId(profileId: string) {
  return getActiveNutritionistByProfileId(profileId);
}
