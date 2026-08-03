import type { AiTaskType, PromptContext } from "./types";
import {
  buildParseDietPrompt,
  buildMealOptionsPrompt,
  buildCravingCheckPrompt,
  buildShoppingListPrompt,
} from "./prompts";

export function buildPrompt(task: AiTaskType, context: PromptContext): string {
  switch (task) {
    case "parse_diet":
      return buildParseDietPrompt(String(context.rawDiet ?? ""));
    case "generate_meal_options":
    case "generate_day_menu":
    case "generate_week_menu":
    case "ingredients_menu":
      return buildMealOptionsPrompt({
        patientName: String(context.patientName ?? "Paciente"),
        mealSlot: String(context.mealSlot ?? "Comida"),
        dietSummary: String(context.dietSummary ?? ""),
        equivalences: String(context.equivalences ?? ""),
        restrictions: String(context.restrictions ?? ""),
        preferences: String(context.preferences ?? ""),
        forbiddenFoods: String(context.forbiddenFoods ?? ""),
        triggerFoods: String(context.triggerFoods ?? ""),
        forbiddenTreats: String(context.forbiddenTreats ?? ""),
        precisionMode: String(context.precisionMode ?? "normal"),
      });
    case "craving_check":
      return buildCravingCheckPrompt({
        patientName: String(context.patientName ?? "Paciente"),
        craving: String(context.craving ?? ""),
        dietSummary: String(context.dietSummary ?? ""),
        restrictions: String(context.restrictions ?? ""),
        forbiddenTreats: String(context.forbiddenTreats ?? ""),
        triggerFoods: String(context.triggerFoods ?? ""),
        precisionMode: String(context.precisionMode ?? "normal"),
        clarificationAnswers: context.clarificationAnswers
          ? String(context.clarificationAnswers)
          : undefined,
      });
    case "shopping_list":
      return buildShoppingListPrompt({
        patientName: String(context.patientName ?? "Paciente"),
        menusSummary: String(context.menusSummary ?? ""),
        days: Number(context.days ?? 7),
      });
    default:
      return "Tarea no reconocida.";
  }
}
