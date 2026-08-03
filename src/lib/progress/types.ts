export type BodyDistribution = "android" | "gynoid" | "mixed" | "unknown";

export type ProgressSource = "manual" | "excel_import" | "photo_extract" | "imported";

export type ProgressConfidence = "alta" | "media" | "baja" | "dudoso";

export type ProgressPhotoType =
  | "anthropometric_sheet"
  | "body_composition_sheet"
  | "other";

export type PhotoExtractionStatus = "pending" | "extracted" | "reviewed" | "failed";

export type ProgressAiProvider = "manual_chatgpt" | "ollama_local" | "openai_api";

export type TrendDirection = "down" | "up" | "stable" | "insufficient_data";

export interface PatientBaselineProfile {
  id: string;
  patient_id: string;
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
  visible_to_patient: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface NutritionCheckin {
  id: string;
  patient_id: string;
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
  source: ProgressSource;
  source_photo_id: string | null;
  source_file_name: string | null;
  source_row_number: number | null;
  confidence: ProgressConfidence | null;
  visible_to_patient: boolean;
  is_deleted: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BodyCompositionEntry {
  id: string;
  patient_id: string;
  measured_at: string;
  weight_kg: number | null;
  body_fat_percent: number | null;
  bone_mass_kg: number | null;
  water_percent: number | null;
  muscle_mass_kg: number | null;
  physique_rating: number | null;
  kcal: number | null;
  metabolic_age: number | null;
  visceral_fat: number | null;
  body_fat_mass_kg: number | null;
  weight_change_kg: number | null;
  body_fat_change_percent: number | null;
  notes: string | null;
  source: ProgressSource;
  source_photo_id: string | null;
  source_file_name: string | null;
  source_row_number: number | null;
  confidence: ProgressConfidence | null;
  visible_to_patient: boolean;
  is_deleted: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProgressSourcePhoto {
  id: string;
  patient_id: string;
  storage_path: string | null;
  photo_type: ProgressPhotoType;
  taken_at: string | null;
  uploaded_by: string | null;
  extraction_status: PhotoExtractionStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProgressAdherenceNote {
  id: string;
  patient_id: string;
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
  source: ProgressSource;
  confidence: ProgressConfidence | null;
  visible_to_patient: boolean;
  is_deleted: boolean;
  source_file_name: string | null;
  source_row_number: number | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProgressEditAuditLog {
  id: string;
  patient_id: string;
  table_name: string;
  record_id: string;
  action: "create" | "update" | "delete" | "restore" | "import";
  before_json: Record<string, unknown> | null;
  after_json: Record<string, unknown> | null;
  changed_by: string | null;
  changed_at: string;
}

export interface ProgressTrendSummary {
  weight: TrendDirection;
  waist: TrendDirection;
  abdomen: TrendDirection;
  body_fat: TrendDirection;
  muscle_mass: TrendDirection;
}

export interface ProgressAiAnalysisPayload {
  summary: string;
  trend: ProgressTrendSummary;
  observations: string[];
  flags: string[];
  questions_for_patient: string[];
  suggested_review_points_for_nutritionist: string[];
  requires_nutritionist_review: boolean;
  confidence: number;
}

export interface ProgressAiAnalysis {
  id: string;
  patient_id: string;
  analysis_date: string;
  range_start: string | null;
  range_end: string | null;
  provider: ProgressAiProvider;
  model: string | null;
  summary: string;
  trend_json: ProgressTrendSummary | Record<string, unknown>;
  flags: string[];
  requires_nutritionist_review: boolean;
  nutritionist_notes: string | null;
  visible_to_patient: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProgressSummaryCards {
  initialWeightKg: number | null;
  latestWeightKg: number | null;
  weightChangeFromStartKg: number | null;
  weightChangeFromLastCheckinKg: number | null;
  initialWaistCm: number | null;
  latestWaistCm: number | null;
  waistChangeFromStartCm: number | null;
  initialAbdomenCm: number | null;
  latestAbdomenCm: number | null;
  abdomenChangeFromStartCm: number | null;
  latestBodyFatPercent: number | null;
  latestMuscleMassKg: number | null;
  lastTrackingDate: string | null;
  checkinCount: number;
  compositionCount: number;
}

export interface PatientProgressData {
  baseline: PatientBaselineProfile | null;
  checkins: NutritionCheckin[];
  composition: BodyCompositionEntry[];
  adherenceNotes: ProgressAdherenceNote[];
  analyses: ProgressAiAnalysis[];
  summary: ProgressSummaryCards;
}
