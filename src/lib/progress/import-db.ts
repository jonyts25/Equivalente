import type { SupabaseClient } from "@supabase/supabase-js";
import type { ParsedProgressWorkbook } from "./excel-parser";
import { logProgressAudit } from "./audit";
import {
  adherenceDuplicateKey,
  checkinDuplicateKey,
  compositionDuplicateKey,
  type ImportApplyStats,
  type ImportDuplicateMode,
} from "./import-service";

export async function applyProgressImportToDb(
  supabase: SupabaseClient,
  input: {
    patientId: string;
    parsed: ParsedProgressWorkbook;
    duplicateMode: ImportDuplicateMode;
    fileName: string;
    profileId: string;
  }
): Promise<ImportApplyStats> {
  const stats: ImportApplyStats = {
    baselineUpserted: false,
    checkinsCreated: 0,
    checkinsUpdated: 0,
    checkinsSkipped: 0,
    compositionCreated: 0,
    compositionUpdated: 0,
    compositionSkipped: 0,
    adherenceCreated: 0,
    adherenceUpdated: 0,
    adherenceSkipped: 0,
  };

  const { data: existingCheckins } = await supabase
    .from("nutrition_checkins")
    .select("*")
    .eq("patient_id", input.patientId);

  const { data: existingComp } = await supabase
    .from("body_composition_entries")
    .select("*")
    .eq("patient_id", input.patientId);

  const { data: existingAdherence } = await supabase
    .from("progress_adherence_notes")
    .select("*")
    .eq("patient_id", input.patientId);

  const checkinByKey = new Map(
    (existingCheckins ?? []).map((c) => [checkinDuplicateKey(c.checkin_date, c.weight_kg), c])
  );
  const compByKey = new Map(
    (existingComp ?? []).map((c) => [compositionDuplicateKey(c.measured_at, c.weight_kg), c])
  );
  const adherenceByKey = new Map(
    (existingAdherence ?? []).map((a) => [adherenceDuplicateKey(a.note_date), a])
  );

  if (input.parsed.baseline) {
    const b = input.parsed.baseline;
    const { data: upserted, error } = await supabase
      .from("patient_baseline_profiles")
      .upsert(
        {
          patient_id: input.patientId,
          height_cm: b.height_cm,
          initial_weight_kg: b.initial_weight_kg,
          ideal_weight_kg: b.ideal_weight_kg,
          max_weight_kg_min: b.max_weight_kg_min,
          max_weight_kg_max: b.max_weight_kg_max,
          body_distribution: b.body_distribution,
          medications_notes: b.medications_notes,
          allergies_notes: b.allergies_notes,
          antecedents_notes: b.antecedents_notes,
          medical_notes: b.medical_notes,
          source_notes: `${b.source_notes ?? ""} Archivo: ${input.fileName}`.trim(),
          updated_by: input.profileId,
          created_by: input.profileId,
        },
        { onConflict: "patient_id" }
      )
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    stats.baselineUpserted = true;
    await logProgressAudit(supabase, {
      patientId: input.patientId,
      tableName: "patient_baseline_profiles",
      recordId: upserted.id,
      action: "import",
      afterJson: b as unknown as Record<string, unknown>,
      changedBy: input.profileId,
    });
  }

  for (const c of input.parsed.checkins) {
    const key = checkinDuplicateKey(c.checkin_date, c.weight_kg);
    const existing = checkinByKey.get(key);
    const row = {
      patient_id: input.patientId,
      checkin_date: c.checkin_date,
      checkin_time: c.checkin_time,
      blood_pressure_text: c.blood_pressure_text,
      diet_label: c.diet_label,
      weight_kg: c.weight_kg,
      chest_cm: c.chest_cm,
      waist_cm: c.waist_cm,
      abdomen_cm: c.abdomen_cm,
      hip_cm: c.hip_cm,
      neck_cm: c.neck_cm,
      bmi: c.bmi,
      weight_change_kg: c.weight_change_kg,
      notes: c.notes,
      source: "excel_import" as const,
      source_file_name: input.fileName,
      source_row_number: c.source_row_number,
      confidence: c.confidence,
      updated_by: input.profileId,
      is_deleted: false,
    };

    if (existing && input.duplicateMode === "skip") {
      stats.checkinsSkipped++;
      continue;
    }
    if (existing && input.duplicateMode === "update") {
      const { error } = await supabase.from("nutrition_checkins").update(row).eq("id", existing.id);
      if (error) throw new Error(error.message);
      stats.checkinsUpdated++;
      await logProgressAudit(supabase, {
        patientId: input.patientId,
        tableName: "nutrition_checkins",
        recordId: existing.id,
        action: "import",
        beforeJson: existing as Record<string, unknown>,
        afterJson: row,
        changedBy: input.profileId,
      });
      continue;
    }

    const { data: inserted, error } = await supabase
      .from("nutrition_checkins")
      .insert({ ...row, created_by: input.profileId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    stats.checkinsCreated++;
    checkinByKey.set(key, { ...row, id: inserted.id });
    await logProgressAudit(supabase, {
      patientId: input.patientId,
      tableName: "nutrition_checkins",
      recordId: inserted.id,
      action: "import",
      afterJson: row,
      changedBy: input.profileId,
    });
  }

  for (const e of input.parsed.bodyComposition) {
    const key = compositionDuplicateKey(e.measured_at, e.weight_kg);
    const existing = compByKey.get(key);
    const row = {
      patient_id: input.patientId,
      measured_at: e.measured_at,
      weight_kg: e.weight_kg,
      body_fat_percent: e.body_fat_percent,
      body_fat_mass_kg: e.body_fat_mass_kg,
      bone_mass_kg: e.bone_mass_kg,
      water_percent: e.water_percent,
      muscle_mass_kg: e.muscle_mass_kg,
      physique_rating: e.physique_rating,
      kcal: e.kcal,
      metabolic_age: e.metabolic_age,
      visceral_fat: e.visceral_fat,
      weight_change_kg: e.weight_change_kg,
      body_fat_change_percent: e.body_fat_change_percent,
      notes: e.notes,
      source: "excel_import" as const,
      source_file_name: input.fileName,
      source_row_number: e.source_row_number,
      confidence: e.confidence,
      updated_by: input.profileId,
      is_deleted: false,
    };

    if (existing && input.duplicateMode === "skip") {
      stats.compositionSkipped++;
      continue;
    }
    if (existing && input.duplicateMode === "update") {
      const { error } = await supabase.from("body_composition_entries").update(row).eq("id", existing.id);
      if (error) throw new Error(error.message);
      stats.compositionUpdated++;
      continue;
    }

    const { data: inserted, error } = await supabase
      .from("body_composition_entries")
      .insert({ ...row, created_by: input.profileId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    stats.compositionCreated++;
    await logProgressAudit(supabase, {
      patientId: input.patientId,
      tableName: "body_composition_entries",
      recordId: inserted.id,
      action: "import",
      afterJson: row,
      changedBy: input.profileId,
    });
  }

  for (const n of input.parsed.adherenceNotes) {
    const key = adherenceDuplicateKey(n.note_date);
    const existing = adherenceByKey.get(key);
    const row = {
      patient_id: input.patientId,
      note_date: n.note_date,
      hunger_level: n.hunger_level,
      cravings_level: n.cravings_level,
      energy_level: n.energy_level,
      sleep_quality: n.sleep_quality,
      digestion: n.digestion,
      exercise: n.exercise,
      estimated_adherence_percent: n.estimated_adherence_percent,
      diet_change_notes: n.diet_change_notes,
      patient_report: n.patient_report,
      nutritionist_note: n.nutritionist_note,
      flags: n.flags,
      source: "excel_import" as const,
      source_file_name: input.fileName,
      source_row_number: n.source_row_number,
      confidence: n.confidence,
      updated_by: input.profileId,
      is_deleted: false,
    };

    if (existing && input.duplicateMode === "skip") {
      stats.adherenceSkipped++;
      continue;
    }
    if (existing && input.duplicateMode === "update") {
      const { error } = await supabase.from("progress_adherence_notes").update(row).eq("id", existing.id);
      if (error) throw new Error(error.message);
      stats.adherenceUpdated++;
      continue;
    }

    const { data: inserted, error } = await supabase
      .from("progress_adherence_notes")
      .insert({ ...row, created_by: input.profileId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    stats.adherenceCreated++;
    await logProgressAudit(supabase, {
      patientId: input.patientId,
      tableName: "progress_adherence_notes",
      recordId: inserted.id,
      action: "import",
      afterJson: row,
      changedBy: input.profileId,
    });
  }

  return stats;
}
