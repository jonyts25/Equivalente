export type UserRole = "admin" | "nutritionist" | "patient";

export type PrecisionMode = "relaxed" | "normal" | "strict";

export type DietPlanStatus = "draft" | "active" | "archived";

export type FoodCategory =
  | "protein"
  | "carb"
  | "fat"
  | "vegetable"
  | "fruit"
  | "dairy"
  | "condiment"
  | "processed"
  | "drink"
  | "other";

export type FoodPreference =
  | "love"
  | "ok"
  | "neutral"
  | "dislike"
  | "rejected"
  | "clinical_ban"
  | "trigger"
  | "forbidden_treat"
  | "controlled";

export type Strictness =
  | "never"
  | "adapted_only"
  | "nutritionist_approval"
  | "exact_portion_only"
  | "allowed";

export type ForbiddenTreatMode =
  | "never_suggest"
  | "adapted_only"
  | "approval_required"
  | "exact_portion_required"
  | "sensory_alternative";

export type GenerationType =
  | "meal_options"
  | "day_menu"
  | "week_menu"
  | "craving"
  | "ingredients"
  | "shopping_list"
  | "parse_diet";

export type MenuStatus =
  | "draft"
  | "pending_review"
  | "approved"
  | "rejected"
  | "favorite"
  | "patient_rejected"
  | "requires_clarification"
  | "blocked";

export type ManualAiTaskType =
  | "parse_diet"
  | "generate_meal_options"
  | "generate_day_menu"
  | "generate_week_menu"
  | "craving_check"
  | "ingredients_menu"
  | "shopping_list";

export type ValidationStatus =
  | "draft"
  | "copied"
  | "pasted"
  | "valid"
  | "invalid"
  | "saved";

export interface Profile {
  id: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Patient {
  id: string;
  profile_id: string | null;
  nutritionist_id: string;
  full_name: string;
  goal: string | null;
  notes: string | null;
  precision_mode: PrecisionMode;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GeneratedMenu {
  id: string;
  patient_id: string;
  diet_plan_id: string | null;
  meal_slot_id: string | null;
  generation_type: GenerationType;
  title: string;
  content_json: Record<string, unknown>;
  explanation: string | null;
  status: MenuStatus;
  created_by: string;
  reviewed_by: string | null;
  created_at: string;
  reviewed_at: string | null;
  updated_at: string;
}
