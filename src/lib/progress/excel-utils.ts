import * as XLSX from "xlsx";
import type { ProgressConfidence } from "./types";

const EXCEL_ERROR_PATTERN = /^#(VALUE|REF|DIV\/0|NUM|NAME|NULL|N\/A|ERROR)!?$/i;

export function normalizeHeader(h: unknown): string {
  return String(h ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function isExcelError(value: unknown): boolean {
  if (value == null) return false;
  const s = String(value).trim();
  return EXCEL_ERROR_PATTERN.test(s);
}

export function cellText(value: unknown): string | null {
  if (value == null || isExcelError(value)) return null;
  const s = String(value).trim();
  return s.length ? s : null;
}

export function parseNumber(value: unknown): number | null {
  if (value == null || isExcelError(value)) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const s = String(value).trim().replace(",", ".");
  if (!s || EXCEL_ERROR_PATTERN.test(s)) return null;
  const n = parseFloat(s.replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

export function parseIntLevel(value: unknown, min = 1, max = 5): number | null {
  const n = parseNumber(value);
  if (n == null) return null;
  const i = Math.round(n);
  if (i < min || i > max) return null;
  return i;
}

export function parseConfidence(value: unknown): ProgressConfidence | null {
  const s = cellText(value)?.toLowerCase();
  if (!s) return null;
  if (["alta", "media", "baja", "dudoso"].includes(s)) return s as ProgressConfidence;
  return null;
}

export function parseExcelDate(value: unknown): string | null {
  if (value == null || isExcelError(value)) return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      const y = parsed.y;
      const m = String(parsed.m).padStart(2, "0");
      const d = String(parsed.d).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
  }

  const s = String(value).trim();
  if (!s) return null;

  // ISO yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // dd/mm/yyyy or dd-mm-yyyy
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) {
    const dd = dmy[1].padStart(2, "0");
    const mm = dmy[2].padStart(2, "0");
    return `${dmy[3]}-${mm}-${dd}`;
  }

  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);

  return null;
}

export function parseExcelTime(value: unknown): string | null {
  if (value == null || isExcelError(value)) return null;
  if (typeof value === "number" && value >= 0 && value < 1) {
    const totalMinutes = Math.round(value * 24 * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
  }
  const s = cellText(value);
  if (!s) return null;
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(s)) {
    return s.length === 5 ? `${s}:00` : s;
  }
  return null;
}

/** Prefer Valor column; fallback to Notas when Valor empty */
export function tolerantFieldValue(valor: unknown, notas: unknown): string | null {
  return cellText(valor) ?? cellText(notas);
}

export function sheetToRows(wb: XLSX.WorkBook, sheetName: string): Record<string, unknown>[] {
  const sheet = wb.Sheets[sheetName];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null, raw: true });
}

export function findSheetName(wb: XLSX.WorkBook, prefix: string): string | undefined {
  return wb.SheetNames.find((n) => normalizeHeader(n).startsWith(normalizeHeader(prefix)));
}

export function rowByHeaders(
  row: Record<string, unknown>,
  ...candidates: string[]
): unknown {
  const keys = Object.keys(row);
  for (const candidate of candidates) {
    const norm = normalizeHeader(candidate);
    const key = keys.find((k) => normalizeHeader(k) === norm || normalizeHeader(k).includes(norm));
    if (key) return row[key];
  }
  return null;
}

export function parseBodyDistribution(raw: string | null): "android" | "gynoid" | "mixed" | "unknown" {
  if (!raw) return "unknown";
  const s = raw.toLowerCase();
  if (s.includes("andro")) return "android";
  if (s.includes("geno")) return "gynoid";
  if (s.includes("mix")) return "mixed";
  return "unknown";
}

export function parseFlags(raw: unknown): string[] {
  const s = cellText(raw);
  if (!s) return [];
  return s.split(/[,;|]/).map((f) => f.trim()).filter(Boolean);
}

export function hasMeasurableCheckin(row: {
  weight_kg?: number | null;
  chest_cm?: number | null;
  waist_cm?: number | null;
  abdomen_cm?: number | null;
  hip_cm?: number | null;
  neck_cm?: number | null;
}): boolean {
  return [
    row.weight_kg,
    row.chest_cm,
    row.waist_cm,
    row.abdomen_cm,
    row.hip_cm,
    row.neck_cm,
  ].some((v) => v != null);
}

export function hasMeasurableComposition(row: {
  weight_kg?: number | null;
  body_fat_percent?: number | null;
  muscle_mass_kg?: number | null;
}): boolean {
  return row.weight_kg != null || row.body_fat_percent != null || row.muscle_mass_kg != null;
}
