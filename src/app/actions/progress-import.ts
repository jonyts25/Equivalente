"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { assertProgressWriteAccess } from "@/lib/progress/access";
import { parseProgressWorkbook } from "@/lib/progress/excel-parser";
import {
  adherenceDuplicateKey,
  checkinDuplicateKey,
  compositionDuplicateKey,
  countImportDuplicates,
  type ImportDuplicateMode,
} from "@/lib/progress/import-service";
import { applyProgressImportToDb } from "@/lib/progress/import-db";
import type { ParsedProgressWorkbook } from "@/lib/progress/excel-parser";

function revalidateProgressPaths(patientId: string) {
  revalidatePath(`/nutriologo/pacientes/${patientId}/seguimiento`);
  revalidatePath(`/nutriologo/pacientes/${patientId}/seguimiento/importar`);
  revalidatePath("/paciente/progreso");
}

export async function previewProgressExcelImport(input: {
  patientId: string;
  fileBase64: string;
}) {
  const access = await assertProgressWriteAccess(input.patientId);
  if (!access.ok) throw new Error(access.error);

  const buffer = Buffer.from(input.fileBase64, "base64");
  const parsed = parseProgressWorkbook(buffer);

  const supabase = await createClient();
  const [{ data: checkins }, { data: comp }, { data: adherence }] = await Promise.all([
    supabase.from("nutrition_checkins").select("checkin_date, weight_kg").eq("patient_id", input.patientId).eq("is_deleted", false),
    supabase.from("body_composition_entries").select("measured_at, weight_kg").eq("patient_id", input.patientId).eq("is_deleted", false),
    supabase.from("progress_adherence_notes").select("note_date").eq("patient_id", input.patientId).eq("is_deleted", false),
  ]);

  const dupes = countImportDuplicates(parsed, {
    checkinKeys: new Set((checkins ?? []).map((c) => checkinDuplicateKey(c.checkin_date, c.weight_kg))),
    compositionKeys: new Set((comp ?? []).map((c) => compositionDuplicateKey(c.measured_at, c.weight_kg))),
    adherenceKeys: new Set((adherence ?? []).map((a) => adherenceDuplicateKey(a.note_date))),
  });

  return {
    parsed,
    stats: {
      baseline: parsed.baseline ? 1 : 0,
      checkins: parsed.checkins.length,
      bodyComposition: parsed.bodyComposition.length,
      adherenceNotes: parsed.adherenceNotes.length,
    },
    ...dupes,
    warnings: parsed.warnings,
    errors: parsed.errors,
  };
}

export async function applyProgressExcelImport(input: {
  patientId: string;
  parsed: ParsedProgressWorkbook;
  duplicateMode: ImportDuplicateMode;
  fileName: string;
}) {
  const access = await assertProgressWriteAccess(input.patientId);
  if (!access.ok) throw new Error(access.error);

  if (input.parsed.errors.length > 0) {
    throw new Error(input.parsed.errors.join(" "));
  }

  const supabase = await createClient();
  const stats = await applyProgressImportToDb(supabase, {
    patientId: input.patientId,
    parsed: input.parsed,
    duplicateMode: input.duplicateMode,
    fileName: input.fileName,
    profileId: access.profileId,
  });

  revalidateProgressPaths(input.patientId);
  return stats;
}
