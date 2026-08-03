import type { ParsedProgressWorkbook } from "./excel-parser";

export type ImportDuplicateMode = "skip" | "update" | "import_anyway";

export type ImportPreviewResult = {
  parsed: ParsedProgressWorkbook;
  duplicateCheckins: number;
  duplicateComposition: number;
  duplicateAdherence: number;
};

export function checkinDuplicateKey(date: string, weightKg: number | null): string {
  return `${date}|${weightKg ?? "null"}`;
}

export function compositionDuplicateKey(date: string, weightKg: number | null): string {
  return `${date}|${weightKg ?? "null"}`;
}

export function adherenceDuplicateKey(date: string): string {
  return date;
}

export function countImportDuplicates(
  parsed: ParsedProgressWorkbook,
  existing: {
    checkinKeys: Set<string>;
    compositionKeys: Set<string>;
    adherenceKeys: Set<string>;
  }
): Pick<ImportPreviewResult, "duplicateCheckins" | "duplicateComposition" | "duplicateAdherence"> {
  let duplicateCheckins = 0;
  let duplicateComposition = 0;
  let duplicateAdherence = 0;

  for (const c of parsed.checkins) {
    if (existing.checkinKeys.has(checkinDuplicateKey(c.checkin_date, c.weight_kg))) {
      duplicateCheckins++;
    }
  }
  for (const e of parsed.bodyComposition) {
    if (existing.compositionKeys.has(compositionDuplicateKey(e.measured_at, e.weight_kg))) {
      duplicateComposition++;
    }
  }
  for (const n of parsed.adherenceNotes) {
    if (existing.adherenceKeys.has(adherenceDuplicateKey(n.note_date))) {
      duplicateAdherence++;
    }
  }

  return { duplicateCheckins, duplicateComposition, duplicateAdherence };
}

export type ImportApplyStats = {
  baselineUpserted: boolean;
  checkinsCreated: number;
  checkinsUpdated: number;
  checkinsSkipped: number;
  compositionCreated: number;
  compositionUpdated: number;
  compositionSkipped: number;
  adherenceCreated: number;
  adherenceUpdated: number;
  adherenceSkipped: number;
};
