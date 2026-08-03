import { z } from "zod";

export const ingredientSchema = z.object({
  name: z.string(),
  portion: z.string(),
  notes: z.string().optional(),
});

export const equivalenceSchema = z.object({
  group: z.enum(["protein", "carb", "fat", "vegetable", "other"]),
  base: z.string(),
  replacement: z.string(),
  explanation: z.string(),
});

export const mealOptionSchema = z.object({
  title: z.string(),
  meal_slot: z.string(),
  ingredients: z.array(ingredientSchema),
  preparation: z.string(),
  replaces: z.string(),
  equivalences: z.array(equivalenceSchema),
  warnings: z.array(z.string()).optional(),
  requires_review: z.boolean(),
  confidence: z.enum(["low", "medium", "high"]),
});

export const mealOptionsResponseSchema = z.object({
  status: z.enum(["ok", "blocked", "requires_clarification"]),
  options: z.array(mealOptionSchema).optional(),
  message: z.string().optional(),
  clarification_questions: z.array(z.string()).optional(),
});

export type MealOptionsResponse = z.infer<typeof mealOptionsResponseSchema>;
