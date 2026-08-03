/**
 * Excel progress import parser tests (no DB).
 */
import {
  buildSampleProgressWorkbookBuffer,
  parseProgressWorkbook,
} from "../src/lib/progress/excel-parser";
import { parseExcelDate } from "../src/lib/progress/excel-utils";
import {
  checkinDuplicateKey,
  countImportDuplicates,
} from "../src/lib/progress/import-service";
import { filterProgressForPatient } from "../src/lib/progress/patient-visibility";

let failed = 0;

function assert(name: string, condition: boolean, detail?: string) {
  if (!condition) {
    failed++;
    console.log("FAIL", name, detail ?? "");
  } else {
    console.log("PASS", name);
  }
}

const sampleBuffer = buildSampleProgressWorkbookBuffer();
const parsed = parseProgressWorkbook(sampleBuffer);

assert("parses baseline from sample workbook", parsed.baseline != null);
assert("baseline height from Notas column", parsed.baseline?.height_cm === 182);
assert("baseline initial weight", parsed.baseline?.initial_weight_kg === 92.5);
assert("body distribution android", parsed.baseline?.body_distribution === "android");
assert("checkins count >= 3", parsed.checkins.length >= 3);
assert("composition count >= 1", parsed.bodyComposition.length >= 1);
assert("adherence notes count >= 1", parsed.adherenceNotes.length >= 1);
assert("no fatal parse errors", parsed.errors.length === 0);

const excelSerialDate = parseExcelDate(45306);
assert("excel serial date converts", excelSerialDate != null && /^\d{4}-\d{2}-\d{2}$/.test(excelSerialDate));

const withFormulaError = parsed.checkins.find((c) => c.checkin_date === "2025-03-10");
assert("formula error row imported", withFormulaError != null);
assert(
  "weight change recalculated after formula error",
  withFormulaError?.weight_change_kg != null && Math.abs((withFormulaError.weight_change_kg ?? 0) - -1.2) < 0.01
);

const sortedWeights = [...parsed.checkins].sort((a, b) => a.checkin_date.localeCompare(b.checkin_date));
assert("checkins sorted have weight changes", sortedWeights.some((c) => c.weight_change_kg != null));

const dupes = countImportDuplicates(parsed, {
  checkinKeys: new Set(
    parsed.checkins.slice(0, 1).map((c) => checkinDuplicateKey(c.checkin_date, c.weight_kg))
  ),
  compositionKeys: new Set(),
  adherenceKeys: new Set(),
});
assert("duplicate detection finds overlapping checkin", dupes.duplicateCheckins >= 1);

const reparse = parseProgressWorkbook(sampleBuffer);
assert("reimport same file yields same counts", reparse.checkins.length === parsed.checkins.length);

const patientVisible = filterProgressForPatient({
  checkins: [
    { id: "1", visible_to_patient: true, is_deleted: false } as never,
    { id: "2", visible_to_patient: false, is_deleted: false } as never,
    { id: "3", visible_to_patient: true, is_deleted: true } as never,
  ],
  composition: [],
  adherenceNotes: [],
  analyses: [],
});
assert("patient sees only visible non-deleted", patientVisible.checkins.length === 1);

console.log(`\nProgress Excel tests complete. Failures: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
