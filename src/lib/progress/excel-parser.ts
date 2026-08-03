import * as XLSX from "xlsx";
import type { BodyDistribution, ProgressConfidence } from "./types";
import {
  cellText,
  findSheetName,
  hasMeasurableCheckin,
  hasMeasurableComposition,
  normalizeHeader,
  parseBodyDistribution,
  parseConfidence,
  parseExcelDate,
  parseExcelTime,
  parseFlags,
  parseIntLevel,
  parseNumber,
  rowByHeaders,
  sheetToRows,
  tolerantFieldValue,
} from "./excel-utils";

export type ParsedBaseline = {
  height_cm: number | null;
  initial_weight_kg: number | null;
  ideal_weight_kg: number | null;
  max_weight_kg_min: number | null;
  max_weight_kg_max: number | null;
  body_distribution: BodyDistribution;
  medical_notes: string | null;
  medications_notes: string | null;
  allergies_notes: string | null;
  antecedents_notes: string | null;
  source_notes: string | null;
  patient_name: string | null;
  age: number | null;
  occupation: string | null;
  initial_bmi: number | null;
};

export type ParsedCheckin = {
  checkin_date: string;
  checkin_time: string | null;
  blood_pressure_text: string | null;
  diet_label: string | null;
  weight_kg: number | null;
  chest_cm: number | null;
  waist_cm: number | null;
  abdomen_cm: number | null;
  hip_cm: number | null;
  neck_cm: number | null;
  bmi: number | null;
  weight_change_kg: number | null;
  notes: string | null;
  confidence: ProgressConfidence | null;
  source_row_number: number;
};

export type ParsedBodyComposition = {
  measured_at: string;
  weight_kg: number | null;
  body_fat_percent: number | null;
  body_fat_mass_kg: number | null;
  bone_mass_kg: number | null;
  water_percent: number | null;
  muscle_mass_kg: number | null;
  physique_rating: number | null;
  kcal: number | null;
  metabolic_age: number | null;
  visceral_fat: number | null;
  weight_change_kg: number | null;
  body_fat_change_percent: number | null;
  notes: string | null;
  confidence: ProgressConfidence | null;
  source_row_number: number;
};

export type ParsedAdherenceNote = {
  note_date: string;
  hunger_level: number | null;
  cravings_level: number | null;
  energy_level: number | null;
  sleep_quality: number | null;
  digestion: string | null;
  exercise: string | null;
  estimated_adherence_percent: number | null;
  diet_change_notes: string | null;
  patient_report: string | null;
  nutritionist_note: string | null;
  flags: string[];
  confidence: ProgressConfidence | null;
  source_row_number: number;
};

export type ParsedProgressWorkbook = {
  baseline: ParsedBaseline | null;
  checkins: ParsedCheckin[];
  bodyComposition: ParsedBodyComposition[];
  adherenceNotes: ParsedAdherenceNote[];
  warnings: string[];
  errors: string[];
};

const BASELINE_FIELD_MAP: Record<string, keyof ParsedBaseline> = {
  nombre: "patient_name",
  edad: "age",
  ocupacion: "occupation",
  "talla cm": "height_cm",
  "peso inicial kg": "initial_weight_kg",
  "peso ideal kg": "ideal_weight_kg",
  "peso maximo kg minimo": "max_weight_kg_min",
  "peso maximo kg maximo": "max_weight_kg_max",
  "peso maximo kg min": "max_weight_kg_min",
  "peso maximo kg max": "max_weight_kg_max",
  "imc inicial": "initial_bmi",
  "distribucion corporal": "body_distribution",
  medicamentos: "medications_notes",
  alergias: "allergies_notes",
  "antecedentes familiares": "antecedents_notes",
  "antecedentes personales patologicos": "antecedents_notes",
  "antecedentes personales no patologicos": "medical_notes",
  "notas base": "source_notes",
};

function isPhoneField(campo: string): boolean {
  return /telefono|teléfono|celular|whatsapp|phone/i.test(campo);
}

export function parseBaselineSheet(rows: Record<string, unknown>[]): {
  baseline: ParsedBaseline | null;
  warnings: string[];
} {
  const warnings: string[] = [];
  const baseline: ParsedBaseline = {
    height_cm: null,
    initial_weight_kg: null,
    ideal_weight_kg: null,
    max_weight_kg_min: null,
    max_weight_kg_max: null,
    body_distribution: "unknown",
    medical_notes: null,
    medications_notes: null,
    allergies_notes: null,
    antecedents_notes: null,
    source_notes: "Importado desde Excel Equivalente",
    patient_name: null,
    age: null,
    occupation: null,
    initial_bmi: null,
  };

  let found = false;

  for (const row of rows) {
    const campoRaw = cellText(rowByHeaders(row, "Campo", "campo"));
    if (!campoRaw) continue;
    if (isPhoneField(campoRaw)) {
      warnings.push(`Campo "${campoRaw}" omitido (teléfono no se importa).`);
      continue;
    }

    const campo = normalizeHeader(campoRaw);
    const valor = rowByHeaders(row, "Valor", "valor");
    const notas = rowByHeaders(row, "Notas", "notas");
    const valueText = tolerantFieldValue(valor, notas);
    if (!valueText) continue;

    const key = BASELINE_FIELD_MAP[campo];
    if (!key) continue;

    found = true;

    if (key === "height_cm" || key === "initial_weight_kg" || key === "ideal_weight_kg" ||
        key === "max_weight_kg_min" || key === "max_weight_kg_max" || key === "initial_bmi" || key === "age") {
      baseline[key] = parseNumber(valueText) as never;
    } else if (key === "body_distribution") {
      baseline.body_distribution = parseBodyDistribution(valueText);
    } else if (key === "patient_name" || key === "occupation") {
      baseline[key] = valueText as never;
    } else {
      const existing = baseline[key] as string | null;
      baseline[key] = existing ? `${existing}; ${valueText}` : valueText;
    }

    if (!cellText(valor) && cellText(notas)) {
      warnings.push(`Campo "${campoRaw}": valor tomado de columna Notas.`);
    }
  }

  return { baseline: found ? baseline : null, warnings };
}

export function parseCheckinsSheet(rows: Record<string, unknown>[]): {
  checkins: ParsedCheckin[];
  warnings: string[];
} {
  const warnings: string[] = [];
  const checkins: ParsedCheckin[] = [];
  let rowNum = 1;

  for (const row of rows) {
    rowNum++;
    const date = parseExcelDate(rowByHeaders(row, "Fecha", "fecha"));
    if (!date) continue;

    const weightChangeRaw = rowByHeaders(row, "Cambio peso vs anterior", "cambio peso vs anterior");
    let weightChange = parseNumber(weightChangeRaw);
    if (isFormulaError(weightChangeRaw)) {
      weightChange = null;
      warnings.push(`Fila ${rowNum}: cambio de peso con error de fórmula — se recalculará si es posible.`);
    }

    const parsed: ParsedCheckin = {
      checkin_date: date,
      checkin_time: parseExcelTime(rowByHeaders(row, "Hora", "hora")),
      blood_pressure_text: cellText(rowByHeaders(row, "T/A", "t/a", "ta")),
      diet_label: cellText(rowByHeaders(row, "Dieta / indicación", "dieta / indicacion", "dieta")),
      weight_kg: parseNumber(rowByHeaders(row, "Peso kg", "peso kg", "peso")),
      chest_cm: parseNumber(rowByHeaders(row, "Tórax cm", "torax cm", "torax")),
      waist_cm: parseNumber(rowByHeaders(row, "Cintura cm", "cintura cm", "cintura")),
      abdomen_cm: parseNumber(rowByHeaders(row, "Abdomen cm", "abdomen cm", "abdomen")),
      hip_cm: parseNumber(rowByHeaders(row, "Cadera cm", "cadera cm", "cadera")),
      neck_cm: parseNumber(rowByHeaders(row, "Cuello cm", "cuello cm", "cuello")),
      bmi: parseNumber(rowByHeaders(row, "IMC", "imc")),
      weight_change_kg: weightChange,
      notes: cellText(rowByHeaders(row, "Notas", "notas")),
      confidence: parseConfidence(rowByHeaders(row, "Confianza", "confianza")),
      source_row_number: rowNum,
    };

    if (!hasMeasurableCheckin(parsed)) {
      warnings.push(`Fila ${rowNum}: fecha ${date} sin medidas — omitida.`);
      continue;
    }

    checkins.push(parsed);
  }

  // Recalculate weight_change_kg when missing
  const sorted = [...checkins].sort((a, b) => a.checkin_date.localeCompare(b.checkin_date));
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    if (cur.weight_change_kg == null && cur.weight_kg != null && prev.weight_kg != null) {
      cur.weight_change_kg = cur.weight_kg - prev.weight_kg;
    }
  }

  return { checkins, warnings };
}

function isFormulaError(value: unknown): boolean {
  const s = cellText(value);
  return s != null && /^#VALUE!/i.test(s);
}

export function parseBodyCompositionSheet(rows: Record<string, unknown>[]): {
  bodyComposition: ParsedBodyComposition[];
  warnings: string[];
} {
  const warnings: string[] = [];
  const entries: ParsedBodyComposition[] = [];
  let rowNum = 1;

  for (const row of rows) {
    rowNum++;
    const date = parseExcelDate(rowByHeaders(row, "Fecha", "fecha"));
    if (!date) continue;

    const parsed: ParsedBodyComposition = {
      measured_at: date,
      weight_kg: parseNumber(rowByHeaders(row, "Peso kg", "peso kg", "peso")),
      body_fat_percent: parseNumber(rowByHeaders(row, "% grasa", "grasa %", "grasa")),
      body_fat_mass_kg: parseNumber(rowByHeaders(row, "Masa grasa kg", "masa grasa kg")),
      bone_mass_kg: parseNumber(rowByHeaders(row, "Masa ósea kg", "masa osea kg", "masa osea")),
      water_percent: parseNumber(rowByHeaders(row, "% agua", "agua %", "agua")),
      muscle_mass_kg: parseNumber(rowByHeaders(row, "Masa muscular kg", "masa muscular kg")),
      physique_rating: parseNumber(rowByHeaders(row, "Complexión física", "complexion fisica", "complexion")),
      kcal: parseNumber(rowByHeaders(row, "Kcal", "kcal")),
      metabolic_age: parseNumber(rowByHeaders(row, "Edad metabólica", "edad metabolica")),
      visceral_fat: parseNumber(rowByHeaders(row, "Grasa visceral", "grasa visceral")),
      weight_change_kg: parseNumber(rowByHeaders(row, "Cambio peso vs anterior", "cambio peso vs anterior")),
      body_fat_change_percent: parseNumber(rowByHeaders(row, "Cambio grasa % vs anterior", "cambio grasa")),
      notes: cellText(rowByHeaders(row, "Notas", "notas")),
      confidence: parseConfidence(rowByHeaders(row, "Confianza", "confianza")),
      source_row_number: rowNum,
    };

    if (!hasMeasurableComposition(parsed)) {
      warnings.push(`Composición fila ${rowNum}: sin datos medibles — omitida.`);
      continue;
    }

    entries.push(parsed);
  }

  const sorted = [...entries].sort((a, b) => a.measured_at.localeCompare(b.measured_at));
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    if (cur.weight_change_kg == null && cur.weight_kg != null && prev.weight_kg != null) {
      cur.weight_change_kg = cur.weight_kg - prev.weight_kg;
    }
    if (cur.body_fat_change_percent == null && cur.body_fat_percent != null && prev.body_fat_percent != null) {
      cur.body_fat_change_percent = cur.body_fat_percent - prev.body_fat_percent;
    }
  }

  return { bodyComposition: entries, warnings };
}

export function parseAdherenceNotesSheet(rows: Record<string, unknown>[]): {
  adherenceNotes: ParsedAdherenceNote[];
  warnings: string[];
} {
  const warnings: string[] = [];
  const notes: ParsedAdherenceNote[] = [];
  let rowNum = 1;

  for (const row of rows) {
    rowNum++;
    const date = parseExcelDate(rowByHeaders(row, "Fecha", "fecha"));
    const patientReport = cellText(rowByHeaders(row, "Paciente reporta", "paciente reporta"));
    const nutritionistNote = cellText(rowByHeaders(row, "Nota nutrióloga", "nota nutriologa"));
    if (!date && !patientReport && !nutritionistNote) continue;
    if (!date) {
      warnings.push(`Adherencia fila ${rowNum}: sin fecha — omitida.`);
      continue;
    }

    notes.push({
      note_date: date,
      hunger_level: parseIntLevel(rowByHeaders(row, "Hambre 1-5", "hambre")),
      cravings_level: parseIntLevel(rowByHeaders(row, "Antojos 1-5", "antojos")),
      energy_level: parseIntLevel(rowByHeaders(row, "Energía 1-5", "energia")),
      sleep_quality: parseIntLevel(rowByHeaders(row, "Sueño 1-5", "sueno")),
      digestion: cellText(rowByHeaders(row, "Digestión", "digestion")),
      exercise: cellText(rowByHeaders(row, "Ejercicio", "ejercicio")),
      estimated_adherence_percent: parseNumber(rowByHeaders(row, "Adherencia estimada %", "adherencia")),
      diet_change_notes: cellText(rowByHeaders(row, "Cambio dieta / ajuste", "cambio dieta")),
      patient_report: patientReport,
      nutritionist_note: nutritionistNote,
      flags: parseFlags(rowByHeaders(row, "Flags", "flags")),
      confidence: parseConfidence(rowByHeaders(row, "Confianza", "confianza")),
      source_row_number: rowNum,
    });
  }

  return { adherenceNotes: notes, warnings };
}

export function parseProgressWorkbook(fileBuffer: ArrayBuffer | Buffer): ParsedProgressWorkbook {
  const wb = XLSX.read(fileBuffer, { type: "buffer", cellDates: true });
  const errors: string[] = [];
  const warnings: string[] = [];

  const baselineSheet = findSheetName(wb, "01 datos base");
  const checkinsSheet = findSheetName(wb, "02 seguimiento medidas");
  const compSheet = findSheetName(wb, "03 composicion corporal");
  const adherenceSheet = findSheetName(wb, "04 notas adherencia");

  if (!baselineSheet) warnings.push("Hoja '01 Datos base' no encontrada.");
  if (!checkinsSheet) warnings.push("Hoja '02 Seguimiento medidas' no encontrada.");
  if (!compSheet) warnings.push("Hoja '03 Composición corporal' no encontrada.");
  if (!adherenceSheet) warnings.push("Hoja '04 Notas adherencia' no encontrada.");

  const baselineResult = baselineSheet
    ? parseBaselineSheet(sheetToRows(wb, baselineSheet))
    : { baseline: null, warnings: [] as string[] };

  const checkinsResult = checkinsSheet
    ? parseCheckinsSheet(sheetToRows(wb, checkinsSheet))
    : { checkins: [] as ParsedCheckin[], warnings: [] as string[] };

  const compResult = compSheet
    ? parseBodyCompositionSheet(sheetToRows(wb, compSheet))
    : { bodyComposition: [] as ParsedBodyComposition[], warnings: [] as string[] };

  const adherenceResult = adherenceSheet
    ? parseAdherenceNotesSheet(sheetToRows(wb, adherenceSheet))
    : { adherenceNotes: [] as ParsedAdherenceNote[], warnings: [] as string[] };

  warnings.push(
    ...baselineResult.warnings,
    ...checkinsResult.warnings,
    ...compResult.warnings,
    ...adherenceResult.warnings
  );

  if (
    !baselineResult.baseline &&
    checkinsResult.checkins.length === 0 &&
    compResult.bodyComposition.length === 0 &&
    adherenceResult.adherenceNotes.length === 0
  ) {
    errors.push("No se detectaron datos importables en el archivo.");
  }

  return {
    baseline: baselineResult.baseline,
    checkins: checkinsResult.checkins,
    bodyComposition: compResult.bodyComposition,
    adherenceNotes: adherenceResult.adherenceNotes,
    warnings,
    errors,
  };
}

/** Build minimal workbook buffer for tests */
export function buildSampleProgressWorkbookBuffer(): Buffer {
  const wb = XLSX.utils.book_new();

  const baselineData = [
    ["Campo", "Valor", "Notas", "Confianza"],
    ["Talla cm", "", "182", "media"],
    ["Peso inicial kg", "92.5", "", "alta"],
    ["Peso ideal kg", "85", "", "alta"],
    ["Distribución corporal", "androide", "", "baja"],
    ["Medicamentos", "Ninguno", "", "alta"],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(baselineData), "01 Datos base");

  const checkinsData = [
    ["Fecha", "Hora", "T/A", "Dieta / indicación", "Peso kg", "Tórax cm", "Cintura cm", "Abdomen cm", "Cadera cm", "Cuello cm", "IMC", "Cambio peso vs anterior", "Fuente", "Confianza", "Notas"],
    [45306, null, "120/80", "Plan A", 92.5, 110, 98, 96, 105, null, 27.9, null, "excel", "alta", "inicio"],
    [45337, null, null, "Plan A", 91.2, 109, 97, 95, 104, null, 27.5, -1.3, "excel", "alta", ""],
    ["2025-03-10", null, null, "Plan A", 90.0, 108, 95, 93, 103, null, null, "#VALUE!", "excel", "media", "formula error ignored"],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(checkinsData), "02 Seguimiento medidas");

  const compData = [
    ["Fecha", "Peso kg", "% grasa", "Masa grasa kg", "Masa ósea kg", "% agua", "Masa muscular kg", "Complexión física", "Kcal", "Edad metabólica", "Grasa visceral", "Cambio peso vs anterior", "Cambio grasa % vs anterior", "Fuente", "Confianza", "Notas"],
    [45337, 91.2, 28.5, null, 3.2, 52, 38.1, 5, 1800, 38, 12, null, null, "excel", "alta", ""],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(compData), "03 Composición corporal");

  const adherenceData = [
    ["Fecha", "Hambre 1-5", "Antojos 1-5", "Energía 1-5", "Sueño 1-5", "Digestión", "Ejercicio", "Adherencia estimada %", "Cambio dieta / ajuste", "Paciente reporta", "Nota nutrióloga", "Flags", "Fuente", "Confianza"],
    ["2025-02-12", 3, 2, 4, 3, "Normal", "Caminata", 80, null, "Me siento bien", "Continuar plan", "ok", "excel", "alta"],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(adherenceData), "04 Notas adherencia");

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
