import { createClient } from "@/lib/supabase/server";
import type { PrecisionMode } from "@/types/database";

const MAX_EQUIVALENCE_GROUPS = 15;
const MAX_ITEMS_PER_GROUP = 8;
const MAX_PREFERENCES = 30;
const MAX_FORBIDDEN_TREATS = 20;

export interface EquivalenteNutritionContext {
  patient: {
    id: string;
    fullName?: string;
    goal?: string | null;
    precisionMode: PrecisionMode;
  };
  dietPlan?: {
    id: string;
    title: string;
    status: string;
  };
  mealSlot?: {
    id: string;
    name: string;
    notes?: string | null;
    requirements?: {
      proteinUnits?: number | null;
      carbUnits?: number | null;
      fatUnits?: number | null;
      vegetableRule?: string | null;
      caloriesTarget?: number | null;
      proteinTarget?: number | null;
      notes?: string | null;
    };
  };
  equivalences: Array<{
    groupName: string;
    category: string;
    items: Array<{
      foodName: string;
      portionLabel: string;
      grams?: number | null;
      units?: number | null;
      notes?: string | null;
    }>;
  }>;
  preferences: Array<{
    foodName: string;
    preference: string;
    strictness?: string | null;
    notes?: string | null;
  }>;
  forbiddenTreats: Array<{
    name: string;
    mode: string;
    triggerRisk: number;
    ambiguityRequired: boolean;
    notes?: string | null;
  }>;
  contextCompleteness: {
    hasActiveDiet: boolean;
    hasMealSlot: boolean;
    hasEquivalences: boolean;
    hasPreferences: boolean;
    hasForbiddenTreats: boolean;
  };
}

export type BuildEquivalenteContextInput = {
  patientId: string;
  dietPlanId?: string;
  mealSlotId?: string;
  includePreferences?: boolean;
  includeForbiddenTreats?: boolean;
  includeEquivalences?: boolean;
};

export function summarizeContextForClient(ctx: EquivalenteNutritionContext) {
  const equivalenceItemCount = ctx.equivalences.reduce((sum, g) => sum + g.items.length, 0);
  const hasDemoEquivalences = ctx.equivalences.some((g) =>
    /demo/i.test(g.groupName)
  );
  return {
    patientId: ctx.patient.id,
    patientName: ctx.patient.fullName,
    precisionMode: ctx.patient.precisionMode,
    dietPlanTitle: ctx.dietPlan?.title,
    dietPlanId: ctx.dietPlan?.id,
    mealSlotName: ctx.mealSlot?.name,
    mealSlotId: ctx.mealSlot?.id,
    equivalenceGroupCount: ctx.equivalences.length,
    equivalenceItemCount,
    hasDemoEquivalences,
    preferenceCount: ctx.preferences.length,
    forbiddenTreatCount: ctx.forbiddenTreats.length,
    ...ctx.contextCompleteness,
  };
}

export async function buildEquivalenteNutritionContext(
  input: BuildEquivalenteContextInput
): Promise<EquivalenteNutritionContext | null> {
  const {
    patientId,
    dietPlanId,
    mealSlotId,
    includePreferences = true,
    includeForbiddenTreats = true,
    includeEquivalences = true,
  } = input;

  const supabase = await createClient();

  const { data: patient, error: patientError } = await supabase
    .from("patients")
    .select("id, full_name, goal, precision_mode")
    .eq("id", patientId)
    .maybeSingle();

  if (patientError || !patient) return null;

  let dietPlanQuery = supabase
    .from("diet_plans")
    .select("id, title, status")
    .eq("patient_id", patientId);

  if (dietPlanId) {
    dietPlanQuery = dietPlanQuery.eq("id", dietPlanId);
  } else {
    dietPlanQuery = dietPlanQuery.eq("status", "active");
  }

  const { data: dietPlan } = await dietPlanQuery.maybeSingle();

  let mealSlot: EquivalenteNutritionContext["mealSlot"] | undefined;
  if (mealSlotId && dietPlan) {
    const { data: slot } = await supabase
      .from("meal_slots")
      .select("id, name, notes, meal_requirements(*)")
      .eq("id", mealSlotId)
      .eq("diet_plan_id", dietPlan.id)
      .maybeSingle();

    if (slot) {
      const req = Array.isArray(slot.meal_requirements)
        ? slot.meal_requirements[0]
        : slot.meal_requirements;
      mealSlot = {
        id: slot.id,
        name: slot.name,
        notes: slot.notes,
        requirements: req
          ? {
              proteinUnits: req.protein_units,
              carbUnits: req.carb_units,
              fatUnits: req.fat_units,
              vegetableRule: req.vegetable_rule,
              caloriesTarget: req.calories_target,
              proteinTarget: req.protein_target,
              notes: req.notes,
            }
          : undefined,
      };
    }
  }

  let equivalences: EquivalenteNutritionContext["equivalences"] = [];
  if (includeEquivalences) {
    const { data: groups } = await supabase
      .from("equivalence_groups")
      .select("name, category, equivalence_items(portion_label, grams, units, notes, food_items(name))")
      .eq("patient_id", patientId)
      .eq("active", true)
      .limit(MAX_EQUIVALENCE_GROUPS);

    equivalences = (groups ?? []).map((g) => {
      const rawItems = g.equivalence_items as unknown;
      const items = Array.isArray(rawItems) ? rawItems : [];
      return {
        groupName: g.name,
        category: g.category,
        items: items.slice(0, MAX_ITEMS_PER_GROUP).map((item: Record<string, unknown>) => {
          const food = item.food_items as { name?: string } | { name?: string }[] | null;
          const foodName = Array.isArray(food)
            ? food[0]?.name
            : food?.name;
          return {
            foodName: foodName ?? "Alimento",
            portionLabel: String(item.portion_label ?? ""),
            grams: item.grams as number | null | undefined,
            units: item.units as number | null | undefined,
            notes: item.notes as string | null | undefined,
          };
        }),
      };
    });
  }

  let preferences: EquivalenteNutritionContext["preferences"] = [];
  if (includePreferences) {
    const { data: prefs } = await supabase
      .from("patient_food_preferences")
      .select("preference, strictness, notes, custom_food_name, food_items(name)")
      .eq("patient_id", patientId)
      .limit(MAX_PREFERENCES);

    preferences = (prefs ?? []).map((p) => {
      const food = p.food_items as unknown;
      let foodName = p.custom_food_name ?? "Alimento";
      if (food && typeof food === "object" && !Array.isArray(food) && "name" in food) {
        foodName = String((food as { name: string }).name);
      }
      return {
        foodName,
        preference: p.preference,
        strictness: p.strictness,
        notes: p.notes,
      };
    });
  }

  let forbiddenTreats: EquivalenteNutritionContext["forbiddenTreats"] = [];
  if (includeForbiddenTreats) {
    const { data: treats } = await supabase
      .from("forbidden_treats")
      .select("name, mode, trigger_risk, ambiguity_required, notes")
      .eq("patient_id", patientId)
      .limit(MAX_FORBIDDEN_TREATS);

    forbiddenTreats = (treats ?? []).map((t) => ({
      name: t.name,
      mode: t.mode,
      triggerRisk: t.trigger_risk ?? 3,
      ambiguityRequired: t.ambiguity_required,
      notes: t.notes,
    }));
  }

  return {
    patient: {
      id: patient.id,
      fullName: patient.full_name,
      goal: patient.goal,
      precisionMode: patient.precision_mode as PrecisionMode,
    },
    dietPlan: dietPlan
      ? { id: dietPlan.id, title: dietPlan.title, status: dietPlan.status }
      : undefined,
    mealSlot,
    equivalences,
    preferences,
    forbiddenTreats,
    contextCompleteness: {
      hasActiveDiet: Boolean(dietPlan?.status === "active" || dietPlan),
      hasMealSlot: Boolean(mealSlot),
      hasEquivalences: equivalences.some((g) => g.items.length > 0),
      hasPreferences: preferences.length > 0,
      hasForbiddenTreats: forbiddenTreats.length > 0,
    },
  };
}

export async function listMealSlotsForDiet(dietPlanId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("meal_slots")
    .select("id, name, slot_order, notes")
    .eq("diet_plan_id", dietPlanId)
    .order("slot_order");
  return data ?? [];
}

export async function listDietPlansForPatient(patientId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("diet_plans")
    .select("id, title, status")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });
  return data ?? [];
}
