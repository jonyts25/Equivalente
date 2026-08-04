"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/session";
import { getNutritionistByProfileId } from "@/lib/data/patient-context";
import { createClient } from "@/lib/supabase/server";

export type DietTemplateRow = {
  id: string;
  title: string;
  raw_text: string | null;
  active: boolean;
  created_at: string;
};

export async function saveDietTemplate(input: {
  title: string;
  rawText: string;
}): Promise<{ id: string }> {
  const profile = await getCurrentProfile();
  if (!profile || !["admin", "nutritionist"].includes(profile.role)) {
    throw new Error("No autorizado");
  }

  const title = input.title.trim();
  const rawText = input.rawText.trim();
  if (!title) throw new Error("El título es obligatorio.");
  if (!rawText) throw new Error("El texto de la dieta es obligatorio.");

  const nutritionist = await getNutritionistByProfileId(profile.id);
  if (!nutritionist) {
    throw new Error("No hay registro de nutrióloga vinculado a tu cuenta.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("diet_templates")
    .insert({
      nutritionist_id: nutritionist.id,
      title,
      raw_text: rawText,
      active: true,
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    throw new Error(error?.message ?? "No se pudo guardar la plantilla.");
  }

  revalidatePath("/nutriologo/dietas");
  revalidatePath("/nutriologo/pacientes");
  return { id: data.id };
}

export async function listDietTemplates(): Promise<DietTemplateRow[]> {
  const profile = await getCurrentProfile();
  if (!profile || !["admin", "nutritionist"].includes(profile.role)) {
    throw new Error("No autorizado");
  }

  const nutritionist = await getNutritionistByProfileId(profile.id);
  if (!nutritionist) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("diet_templates")
    .select("id, title, raw_text, active, created_at")
    .eq("nutritionist_id", nutritionist.id)
    .eq("active", true)
    .order("title");

  if (error) throw new Error(error.message);
  return (data ?? []) as DietTemplateRow[];
}
