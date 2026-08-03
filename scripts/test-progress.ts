/**
 * Unit tests: progress summary, guardrails, patient visibility (no DB).
 */
import {
  applyProgressAnalysisGuardrails,
  hasForbiddenProgressLanguage,
  hasScoldingProgressLanguage,
  normalizeProgressAnalysisPayload,
} from "../src/lib/ai/progress-analysis-guardrails";
import {
  computeProgressSummary,
  enrichCheckinsWithDeltas,
} from "../src/lib/progress/summary";
import type {
  BodyCompositionEntry,
  NutritionCheckin,
  PatientBaselineProfile,
} from "../src/lib/progress/types";

import { canPatientWriteProgress, isProgressAnalysisVisibleToPatient } from "../src/lib/progress/patient-visibility";

let failed = 0;

function assert(name: string, condition: boolean, detail?: string) {
  if (!condition) {
    failed++;
    console.log("FAIL", name, detail ?? "");
  } else {
    console.log("PASS", name);
  }
}

const baseline: PatientBaselineProfile = {
  id: "b1",
  patient_id: "p1",
  height_cm: 182,
  initial_weight_kg: 92.5,
  ideal_weight_kg: 85,
  max_weight_kg_min: null,
  max_weight_kg_max: null,
  body_distribution: "unknown",
  medical_notes: null,
  medications_notes: null,
  allergies_notes: null,
  antecedents_notes: null,
  source_notes: "Demo",
  visible_to_patient: false,
  created_by: null,
  updated_by: null,
  created_at: "",
  updated_at: "",
};

const checkins: NutritionCheckin[] = [
  {
    id: "c1",
    patient_id: "p1",
    checkin_date: "2025-06-03",
    checkin_time: null,
    blood_pressure_text: null,
    diet_label: null,
    weight_kg: 88.5,
    chest_cm: 105,
    waist_cm: 92,
    abdomen_cm: 90,
    hip_cm: 100,
    neck_cm: null,
    bmi: null,
    weight_change_kg: null,
    notes: null,
    source: "manual",
    source_photo_id: null,
    source_file_name: null,
    source_row_number: null,
    confidence: null,
    visible_to_patient: true,
    is_deleted: false,
    created_by: null,
    updated_by: null,
    created_at: "",
    updated_at: "",
  },
  {
    id: "c2",
    patient_id: "p1",
    checkin_date: "2025-01-15",
    checkin_time: null,
    blood_pressure_text: null,
    diet_label: null,
    weight_kg: 92.5,
    chest_cm: 110,
    waist_cm: 98,
    abdomen_cm: 96,
    hip_cm: 105,
    neck_cm: null,
    bmi: null,
    weight_change_kg: null,
    notes: null,
    source: "manual",
    source_photo_id: null,
    source_file_name: null,
    source_row_number: null,
    confidence: null,
    visible_to_patient: true,
    is_deleted: false,
    created_by: null,
    updated_by: null,
    created_at: "",
    updated_at: "",
  },
];

const composition: BodyCompositionEntry[] = [
  {
    id: "e1",
    patient_id: "p1",
    measured_at: "2025-06-03",
    weight_kg: 88.5,
    body_fat_percent: 26.5,
    bone_mass_kg: null,
    water_percent: 54,
    muscle_mass_kg: 39.8,
    physique_rating: null,
    kcal: null,
    metabolic_age: 35,
    visceral_fat: 10,
    body_fat_mass_kg: null,
    weight_change_kg: null,
    body_fat_change_percent: null,
    notes: null,
    source: "manual",
    source_photo_id: null,
    source_file_name: null,
    source_row_number: null,
    confidence: null,
    visible_to_patient: true,
    is_deleted: false,
    created_by: null,
    updated_by: null,
    created_at: "",
    updated_at: "",
  },
];

const summary = computeProgressSummary(baseline, checkins, composition);
assert("latest weight", summary.latestWeightKg === 88.5);
assert("initial weight", summary.initialWeightKg === 92.5);
assert("weight change from start", summary.weightChangeFromStartKg === -4);
assert("weight change last checkin", summary.weightChangeFromLastCheckinKg === -4);
assert("latest waist", summary.latestWaistCm === 92);
assert("waist change", summary.waistChangeFromStartCm === -6);
assert("abdomen change", summary.abdomenChangeFromStartCm === -6);
assert("latest body fat", summary.latestBodyFatPercent === 26.5);
assert("latest muscle", summary.latestMuscleMassKg === 39.8);
assert("checkin count active", summary.checkinCount === 2);

const withDeleted = computeProgressSummary(baseline, [
  ...checkins,
  { ...checkins[0], id: "c-deleted", is_deleted: true, checkin_date: "2025-07-01", weight_kg: 50 },
], composition);
assert("ignores deleted checkins", withDeleted.checkinCount === 2);

const payload = normalizeProgressAnalysisPayload({
  summary: "Tendencia favorable en peso y cintura.",
  trend: { weight: "down", waist: "down", abdomen: "down", body_fat: "down", muscle_mass: "stable" },
  observations: ["Progreso gradual."],
  flags: ["waist_improving"],
  questions_for_patient: ["¿Cómo te sientes con el plan?"],
  suggested_review_points_for_nutritionist: ["Confirmar porciones en comida."],
  requires_nutritionist_review: false,
  confidence: 0.95,
});

assert("always requires review", payload.requires_nutritionist_review === true);
const guarded = applyProgressAnalysisGuardrails(payload);
assert("confidence capped", guarded.confidence <= 0.75);

const bad = applyProgressAnalysisGuardrails(
  normalizeProgressAnalysisPayload({
    summary: "Diagnóstico de resistencia a la insulina. Toma metformina.",
    trend: { weight: "up", waist: "up", abdomen: "up", body_fat: "up", muscle_mass: "down" },
    observations: [],
    flags: [],
    questions_for_patient: [],
    suggested_review_points_for_nutritionist: [],
    requires_nutritionist_review: false,
    confidence: 0.9,
  })
);
assert("forbidden language corrected", bad.flags.includes("guardrail_corrected"));
assert("no diagnosis in summary", !/metformina/i.test(bad.summary));
assert("hasForbiddenProgressLanguage", hasForbiddenProgressLanguage("prescribir suplementos"));
assert("hasScoldingProgressLanguage", hasScoldingProgressLanguage("es tu culpa"));

const insufficient = applyProgressAnalysisGuardrails(
  normalizeProgressAnalysisPayload({
    summary: "Pocos datos.",
    trend: { weight: "down", waist: "stable", abdomen: "stable", body_fat: "stable", muscle_mass: "stable" },
    observations: [],
    flags: [],
    questions_for_patient: [],
    suggested_review_points_for_nutritionist: [],
    requires_nutritionist_review: false,
    confidence: 0.9,
  }),
  { measurementCount: 1 }
);
assert("insufficient data flag", insufficient.flags.includes("insufficient_data"));
assert("low confidence few measurements", insufficient.confidence <= 0.35);

const deltas = enrichCheckinsWithDeltas(checkins);
assert("checkin delta weight", deltas[0]?.weightDelta === -4);

assert("patient cannot write progress", canPatientWriteProgress() === false);
assert("patient cannot see hidden analysis", !isProgressAnalysisVisibleToPatient(false));
assert("patient sees visible analysis", isProgressAnalysisVisibleToPatient(true));

console.log(`\nProgress tests complete. Failures: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
