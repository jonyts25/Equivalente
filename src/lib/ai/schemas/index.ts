import type { z } from "zod";
import type { AiTaskType } from "../types";
import { parseDietResponseSchema } from "./parse-diet.schema";
import { mealOptionsResponseSchema } from "./meal-options.schema";
import { cravingCheckResponseSchema } from "./craving-check.schema";
import { shoppingListResponseSchema } from "./shopping-list.schema";

export const TASK_SCHEMAS: Record<AiTaskType, z.ZodType> = {
  parse_diet: parseDietResponseSchema,
  generate_meal_options: mealOptionsResponseSchema,
  generate_day_menu: mealOptionsResponseSchema,
  generate_week_menu: mealOptionsResponseSchema,
  craving_check: cravingCheckResponseSchema,
  ingredients_menu: mealOptionsResponseSchema,
  shopping_list: shoppingListResponseSchema,
};

export * from "./parse-diet.schema";
export * from "./meal-options.schema";
export * from "./craving-check.schema";
export * from "./shopping-list.schema";
