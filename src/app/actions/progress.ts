"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/session";
import {
  assertProgressAccess,
  assertProgressAnalysisAccess,
  assertProgressWriteAccess,
} from "@/lib/progress/access";
import { computeProgressSummary } from "@/lib/progress/summary";
import type {
  BodyCompositionEntry,
  BodyDistribution,
  NutritionCheckin,
  PatientBaselineProfile,
  PatientProgressData,
  ProgressAiAnalysis,
  ProgressPhotoType,
  ProgressSource,
  ProgressAdherenceNote,
} from "@/lib/progress/types";
import { logProgressAudit } from "@/lib/progress/audit";

export async function getPatientProgress(patientId: string): Promise<PatientProgressData> {
  const access = await assertProgressAccess(patientId);
  if (!access.ok) throw new Error(access.error);

  const supabase = await createClient();

  const baselineQuery = supabase
    .from("patient_baseline_profiles")
    .select("*")
    .eq("patient_id", patientId)
    .maybeSingle();

  let checkinsQuery = supabase
    .from("nutrition_checkins")
    .select("*")
    .eq("patient_id", patientId)
    .order("checkin_date", { ascending: false });

  let compositionQuery = supabase
    .from("body_composition_entries")
    .select("*")
    .eq("patient_id", patientId)
    .order("measured_at", { ascending: false });

  let adherenceQuery = supabase
    .from("progress_adherence_notes")
    .select("*")
    .eq("patient_id", patientId)
    .order("note_date", { ascending: false });

  if (access.role === "patient") {
    checkinsQuery = checkinsQuery.eq("visible_to_patient", true).eq("is_deleted", false);
    compositionQuery = compositionQuery.eq("visible_to_patient", true).eq("is_deleted", false);
    adherenceQuery = adherenceQuery.eq("visible_to_patient", true).eq("is_deleted", false);
  }

  const [{ data: baseline }, { data: checkins }, { data: composition }, { data: adherence }] =
    await Promise.all([baselineQuery, checkinsQuery, compositionQuery, adherenceQuery]);

  let analysesQuery = supabase
    .from("progress_ai_analyses")
    .select("*")
    .eq("patient_id", patientId)
    .order("analysis_date", { ascending: false });

  if (access.role === "patient") {
    analysesQuery = analysesQuery.eq("visible_to_patient", true);
  }

  const { data: analyses } = await analysesQuery;

  const baselineRow = baseline as PatientBaselineProfile | null;
  const checkinRows = (checkins ?? []) as NutritionCheckin[];
  const compRows = (composition ?? []) as BodyCompositionEntry[];
  const adherenceRows = (adherence ?? []) as ProgressAdherenceNote[];

  const visibleBaseline =
    access.role === "patient" && baselineRow && !baselineRow.visible_to_patient ? null : baselineRow;

  const activeCheckins = checkinRows.filter((c) => !c.is_deleted);
  const activeComp = compRows.filter((c) => !c.is_deleted);

  return {
    baseline: visibleBaseline,
    checkins: access.role === "patient" ? activeCheckins.filter((c) => c.visible_to_patient) : checkinRows,
    composition: access.role === "patient" ? activeComp.filter((c) => c.visible_to_patient) : compRows,
    adherenceNotes:
      access.role === "patient"
        ? adherenceRows.filter((a) => a.visible_to_patient && !a.is_deleted)
        : adherenceRows,
    analyses: (analyses ?? []) as ProgressAiAnalysis[],
    summary: computeProgressSummary(visibleBaseline, activeCheckins, activeComp),
  };
}

export async function getProgressSummary(patientId: string) {
  const data = await getPatientProgress(patientId);
  if (!data) throw new Error("Sin datos");
  return data.summary;
}

export async function upsertPatientBaselineProfile(input: {
  patientId: string;
  heightCm?: number | null;
  initialWeightKg?: number | null;
  idealWeightKg?: number | null;
  maxWeightKgMin?: number | null;
  maxWeightKgMax?: number | null;
  bodyDistribution?: BodyDistribution;
  medicalNotes?: string | null;
  medicationsNotes?: string | null;
  allergiesNotes?: string | null;
  antecedentsNotes?: string | null;
  sourceNotes?: string | null;
}) {
  const access = await assertProgressWriteAccess(input.patientId);
  if (!access.ok) throw new Error(access.error);

  const supabase = await createClient();
  const row = {
    patient_id: input.patientId,
    height_cm: input.heightCm ?? null,
    initial_weight_kg: input.initialWeightKg ?? null,
    ideal_weight_kg: input.idealWeightKg ?? null,
    max_weight_kg_min: input.maxWeightKgMin ?? null,
    max_weight_kg_max: input.maxWeightKgMax ?? null,
    body_distribution: input.bodyDistribution ?? "unknown",
    medical_notes: input.medicalNotes ?? null,
    medications_notes: input.medicationsNotes ?? null,
    allergies_notes: input.allergiesNotes ?? null,
    antecedents_notes: input.antecedentsNotes ?? null,
    source_notes: input.sourceNotes ?? null,
    created_by: access.profileId,
  };

  const { data, error } = await supabase
    .from("patient_baseline_profiles")
    .upsert(row, { onConflict: "patient_id" })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  revalidateProgressPaths(input.patientId);
  return data;
}

export async function createNutritionCheckin(input: {
  patientId: string;
  checkinDate: string;
  bloodPressureText?: string | null;
  dietLabel?: string | null;
  weightKg?: number | null;
  chestCm?: number | null;
  waistCm?: number | null;
  abdomenCm?: number | null;
  hipCm?: number | null;
  neckCm?: number | null;
  notes?: string | null;
  source?: ProgressSource;
  sourcePhotoId?: string | null;
}) {
  const access = await assertProgressWriteAccess(input.patientId);
  if (!access.ok) throw new Error(access.error);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("nutrition_checkins")
    .insert({
      patient_id: input.patientId,
      checkin_date: input.checkinDate,
      blood_pressure_text: input.bloodPressureText ?? null,
      diet_label: input.dietLabel ?? null,
      weight_kg: input.weightKg ?? null,
      chest_cm: input.chestCm ?? null,
      waist_cm: input.waistCm ?? null,
      abdomen_cm: input.abdomenCm ?? null,
      hip_cm: input.hipCm ?? null,
      neck_cm: input.neckCm ?? null,
      notes: input.notes ?? null,
      source: input.source ?? "manual",
      source_photo_id: input.sourcePhotoId ?? null,
      created_by: access.profileId,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  revalidateProgressPaths(input.patientId);
  return data;
}

export async function updateNutritionCheckin(
  id: string,
  patientId: string,
  input: Partial<Omit<Parameters<typeof createNutritionCheckin>[0], "patientId">> & {
    confidence?: import("@/lib/progress/types").ProgressConfidence | null;
    visibleToPatient?: boolean;
  }
) {
  const access = await assertProgressWriteAccess(patientId);
  if (!access.ok) throw new Error(access.error);

  const supabase = await createClient();
  const { data: before } = await supabase
    .from("nutrition_checkins")
    .select("*")
    .eq("id", id)
    .eq("patient_id", patientId)
    .single();

  const patch: Record<string, unknown> = { updated_by: access.profileId };
  if (input.checkinDate !== undefined) patch.checkin_date = input.checkinDate;
  if (input.bloodPressureText !== undefined) patch.blood_pressure_text = input.bloodPressureText;
  if (input.dietLabel !== undefined) patch.diet_label = input.dietLabel;
  if (input.weightKg !== undefined) patch.weight_kg = input.weightKg;
  if (input.chestCm !== undefined) patch.chest_cm = input.chestCm;
  if (input.waistCm !== undefined) patch.waist_cm = input.waistCm;
  if (input.abdomenCm !== undefined) patch.abdomen_cm = input.abdomenCm;
  if (input.hipCm !== undefined) patch.hip_cm = input.hipCm;
  if (input.neckCm !== undefined) patch.neck_cm = input.neckCm;
  if (input.notes !== undefined) patch.notes = input.notes;
  if (input.confidence !== undefined) patch.confidence = input.confidence;
  if (input.visibleToPatient !== undefined) patch.visible_to_patient = input.visibleToPatient;

  const { data: after, error } = await supabase
    .from("nutrition_checkins")
    .update(patch)
    .eq("id", id)
    .eq("patient_id", patientId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  if (before && after) {
    await logProgressAudit(supabase, {
      patientId,
      tableName: "nutrition_checkins",
      recordId: id,
      action: "update",
      beforeJson: before as Record<string, unknown>,
      afterJson: after as Record<string, unknown>,
      changedBy: access.profileId,
    });
  }
  revalidateProgressPaths(patientId);
}

export async function softDeleteCheckin(id: string, patientId: string) {
  const access = await assertProgressWriteAccess(patientId);
  if (!access.ok) throw new Error(access.error);
  const supabase = await createClient();
  const { data: before } = await supabase.from("nutrition_checkins").select("*").eq("id", id).single();
  const { data: after, error } = await supabase
    .from("nutrition_checkins")
    .update({ is_deleted: true, updated_by: access.profileId })
    .eq("id", id)
    .eq("patient_id", patientId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  await logProgressAudit(supabase, {
    patientId,
    tableName: "nutrition_checkins",
    recordId: id,
    action: "delete",
    beforeJson: before as Record<string, unknown>,
    afterJson: after as Record<string, unknown>,
    changedBy: access.profileId,
  });
  revalidateProgressPaths(patientId);
}

export async function restoreCheckin(id: string, patientId: string) {
  const access = await assertProgressWriteAccess(patientId);
  if (!access.ok) throw new Error(access.error);
  const supabase = await createClient();
  const { error } = await supabase
    .from("nutrition_checkins")
    .update({ is_deleted: false, updated_by: access.profileId })
    .eq("id", id)
    .eq("patient_id", patientId);
  if (error) throw new Error(error.message);
  await logProgressAudit(supabase, {
    patientId,
    tableName: "nutrition_checkins",
    recordId: id,
    action: "restore",
    changedBy: access.profileId,
  });
  revalidateProgressPaths(patientId);
}

export async function setCheckinVisibility(id: string, patientId: string, visible: boolean) {
  const access = await assertProgressWriteAccess(patientId);
  if (!access.ok) throw new Error(access.error);
  const supabase = await createClient();
  const { error } = await supabase
    .from("nutrition_checkins")
    .update({ visible_to_patient: visible, updated_by: access.profileId })
    .eq("id", id)
    .eq("patient_id", patientId);
  if (error) throw new Error(error.message);
  revalidateProgressPaths(patientId);
}

export async function createBodyCompositionEntry(input: {
  patientId: string;
  measuredAt: string;
  weightKg?: number | null;
  bodyFatPercent?: number | null;
  boneMassKg?: number | null;
  waterPercent?: number | null;
  muscleMassKg?: number | null;
  physiqueRating?: number | null;
  kcal?: number | null;
  metabolicAge?: number | null;
  visceralFat?: number | null;
  bodyFatMassKg?: number | null;
  notes?: string | null;
  source?: ProgressSource;
  sourcePhotoId?: string | null;
}) {
  const access = await assertProgressWriteAccess(input.patientId);
  if (!access.ok) throw new Error(access.error);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("body_composition_entries")
    .insert({
      patient_id: input.patientId,
      measured_at: input.measuredAt,
      weight_kg: input.weightKg ?? null,
      body_fat_percent: input.bodyFatPercent ?? null,
      bone_mass_kg: input.boneMassKg ?? null,
      water_percent: input.waterPercent ?? null,
      muscle_mass_kg: input.muscleMassKg ?? null,
      physique_rating: input.physiqueRating ?? null,
      kcal: input.kcal ?? null,
      metabolic_age: input.metabolicAge ?? null,
      visceral_fat: input.visceralFat ?? null,
      body_fat_mass_kg: input.bodyFatMassKg ?? null,
      notes: input.notes ?? null,
      source: input.source ?? "manual",
      source_photo_id: input.sourcePhotoId ?? null,
      created_by: access.profileId,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  revalidateProgressPaths(input.patientId);
  return data;
}

export async function updateBodyCompositionEntry(
  id: string,
  patientId: string,
  input: Partial<Omit<Parameters<typeof createBodyCompositionEntry>[0], "patientId">> & {
    confidence?: import("@/lib/progress/types").ProgressConfidence | null;
    visibleToPatient?: boolean;
  }
) {
  const access = await assertProgressWriteAccess(patientId);
  if (!access.ok) throw new Error(access.error);

  const supabase = await createClient();
  const { data: before } = await supabase
    .from("body_composition_entries")
    .select("*")
    .eq("id", id)
    .eq("patient_id", patientId)
    .single();

  const patch: Record<string, unknown> = { updated_by: access.profileId };
  if (input.measuredAt !== undefined) patch.measured_at = input.measuredAt;
  if (input.weightKg !== undefined) patch.weight_kg = input.weightKg;
  if (input.bodyFatPercent !== undefined) patch.body_fat_percent = input.bodyFatPercent;
  if (input.bodyFatMassKg !== undefined) patch.body_fat_mass_kg = input.bodyFatMassKg;
  if (input.boneMassKg !== undefined) patch.bone_mass_kg = input.boneMassKg;
  if (input.waterPercent !== undefined) patch.water_percent = input.waterPercent;
  if (input.muscleMassKg !== undefined) patch.muscle_mass_kg = input.muscleMassKg;
  if (input.physiqueRating !== undefined) patch.physique_rating = input.physiqueRating;
  if (input.kcal !== undefined) patch.kcal = input.kcal;
  if (input.metabolicAge !== undefined) patch.metabolic_age = input.metabolicAge;
  if (input.visceralFat !== undefined) patch.visceral_fat = input.visceralFat;
  if (input.notes !== undefined) patch.notes = input.notes;
  if (input.confidence !== undefined) patch.confidence = input.confidence;
  if (input.visibleToPatient !== undefined) patch.visible_to_patient = input.visibleToPatient;

  const { data: after, error } = await supabase
    .from("body_composition_entries")
    .update(patch)
    .eq("id", id)
    .eq("patient_id", patientId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  if (before && after) {
    await logProgressAudit(supabase, {
      patientId,
      tableName: "body_composition_entries",
      recordId: id,
      action: "update",
      beforeJson: before as Record<string, unknown>,
      afterJson: after as Record<string, unknown>,
      changedBy: access.profileId,
    });
  }
  revalidateProgressPaths(patientId);
}

export async function createProgressSourcePhoto(input: {
  patientId: string;
  storagePath?: string | null;
  photoType?: ProgressPhotoType;
  takenAt?: string | null;
  notes?: string | null;
}) {
  const access = await assertProgressWriteAccess(input.patientId);
  if (!access.ok) throw new Error(access.error);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("progress_source_photos")
    .insert({
      patient_id: input.patientId,
      storage_path: input.storagePath ?? null,
      photo_type: input.photoType ?? "other",
      taken_at: input.takenAt ?? null,
      notes: input.notes ?? null,
      uploaded_by: access.profileId,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  revalidateProgressPaths(input.patientId);
  return data;
}

export async function createProgressAiAnalysis(input: {
  patientId: string;
  summary: string;
  trendJson: Record<string, unknown>;
  flags?: string[];
  model?: string | null;
  rangeStart?: string | null;
  rangeEnd?: string | null;
  rawPayload?: Record<string, unknown>;
}) {
  const access = await assertProgressAnalysisAccess(input.patientId);
  if (!access.ok) throw new Error(access.error);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("progress_ai_analyses")
    .insert({
      patient_id: input.patientId,
      range_start: input.rangeStart ?? null,
      range_end: input.rangeEnd ?? null,
      provider: "ollama_local",
      model: input.model ?? null,
      summary: input.summary,
      trend_json: {
        ...input.trendJson,
        raw: input.rawPayload ?? null,
      },
      flags: input.flags ?? [],
      requires_nutritionist_review: true,
      visible_to_patient: false,
      created_by: access.profileId,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  revalidateProgressPaths(input.patientId);
  return data;
}

export async function setProgressAnalysisVisibility(
  analysisId: string,
  patientId: string,
  visible: boolean,
  nutritionistNotes?: string | null
) {
  const access = await assertProgressWriteAccess(patientId);
  if (!access.ok) throw new Error(access.error);

  const supabase = await createClient();
  const { error } = await supabase
    .from("progress_ai_analyses")
    .update({
      visible_to_patient: visible,
      nutritionist_notes: nutritionistNotes ?? null,
    })
    .eq("id", analysisId)
    .eq("patient_id", patientId);

  if (error) throw new Error(error.message);
  revalidateProgressPaths(patientId);
}

export async function softDeleteComposition(id: string, patientId: string) {
  const access = await assertProgressWriteAccess(patientId);
  if (!access.ok) throw new Error(access.error);
  const supabase = await createClient();
  const { error } = await supabase
    .from("body_composition_entries")
    .update({ is_deleted: true, updated_by: access.profileId })
    .eq("id", id)
    .eq("patient_id", patientId);
  if (error) throw new Error(error.message);
  await logProgressAudit(supabase, {
    patientId,
    tableName: "body_composition_entries",
    recordId: id,
    action: "delete",
    changedBy: access.profileId,
  });
  revalidateProgressPaths(patientId);
}

export async function restoreComposition(id: string, patientId: string) {
  const access = await assertProgressWriteAccess(patientId);
  if (!access.ok) throw new Error(access.error);
  const supabase = await createClient();
  const { error } = await supabase
    .from("body_composition_entries")
    .update({ is_deleted: false, updated_by: access.profileId })
    .eq("id", id)
    .eq("patient_id", patientId);
  if (error) throw new Error(error.message);
  await logProgressAudit(supabase, {
    patientId,
    tableName: "body_composition_entries",
    recordId: id,
    action: "restore",
    changedBy: access.profileId,
  });
  revalidateProgressPaths(patientId);
}

export async function setCompositionVisibility(id: string, patientId: string, visible: boolean) {
  const access = await assertProgressWriteAccess(patientId);
  if (!access.ok) throw new Error(access.error);
  const supabase = await createClient();
  const { error } = await supabase
    .from("body_composition_entries")
    .update({ visible_to_patient: visible, updated_by: access.profileId })
    .eq("id", id)
    .eq("patient_id", patientId);
  if (error) throw new Error(error.message);
  revalidateProgressPaths(patientId);
}

export async function archiveProgressAnalysis(analysisId: string, patientId: string) {
  const access = await assertProgressWriteAccess(patientId);
  if (!access.ok) throw new Error(access.error);

  const supabase = await createClient();
  const { data: before } = await supabase
    .from("progress_ai_analyses")
    .select("*")
    .eq("id", analysisId)
    .eq("patient_id", patientId)
    .single();

  const { error } = await supabase
    .from("progress_ai_analyses")
    .delete()
    .eq("id", analysisId)
    .eq("patient_id", patientId);

  if (error) throw new Error(error.message);

  if (before) {
    await logProgressAudit(supabase, {
      patientId,
      tableName: "progress_ai_analyses",
      recordId: analysisId,
      action: "delete",
      beforeJson: before as Record<string, unknown>,
      changedBy: access.profileId,
    });
  }
  revalidateProgressPaths(patientId);
}

export async function assertPatientCannotCreateAnalysis() {
  const profile = await getCurrentProfile();
  if (profile?.role === "patient") {
    throw new Error("Pacientes no pueden crear análisis de progreso.");
  }
}

function revalidateProgressPaths(patientId: string) {
  revalidatePath(`/nutriologo/pacientes/${patientId}/seguimiento`);
  revalidatePath(`/nutriologo/pacientes/${patientId}/seguimiento/nuevo`);
  revalidatePath(`/nutriologo/pacientes/${patientId}/seguimiento/importar`);
  revalidatePath(`/nutriologo/pacientes/${patientId}/seguimiento/analisis`);
  revalidatePath("/paciente/progreso");
}
