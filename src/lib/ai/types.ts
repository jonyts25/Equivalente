export type AiProvider = "manual_chatgpt" | "ollama_local" | "openai_api" | "ollama_queue";

export type AiTaskType =
  | "parse_diet"
  | "generate_meal_options"
  | "generate_day_menu"
  | "generate_week_menu"
  | "craving_check"
  | "ingredients_menu"
  | "shopping_list";

export type AiModeResult =
  | {
      mode: "manual";
      promptText: string;
      taskType: AiTaskType;
      metadata?: Record<string, unknown>;
    }
  | {
      mode: "automatic";
      output: unknown;
      taskType: AiTaskType;
      provider: AiProvider;
      metadata?: Record<string, unknown>;
    }
  | {
      mode: "queued";
      jobId: string;
      taskType: AiTaskType;
      metadata?: Record<string, unknown>;
    };

export type AiRequestContext = {
  userId: string;
  patientId?: string;
  role: "admin" | "nutritionist" | "patient";
  taskType: AiTaskType;
  input: PromptContext;
};

export type PromptContext = Record<string, string | number | undefined>;

export interface ValidationResult {
  valid: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

export interface AiUsageReservation {
  id: string;
  patientId?: string;
  nutritionistId?: string;
  taskType: AiTaskType;
  provider: AiProvider;
  creditsReserved: number;
}
