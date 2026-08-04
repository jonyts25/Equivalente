import { z } from "zod";
import { ingredientSchema } from "@/lib/ai/schemas/meal-options.schema";

export const dayMealSchema = z.object({
  meal_slot: z.string(),
  title: z.string(),
  ingredients: z.array(ingredientSchema),
  preparation: z.string(),
  notes: z.string().optional(),
});

export const weekDaySchema = z.object({
  day_number: z.number().min(1).max(7),
  day_label: z.string(),
  meals: z.array(dayMealSchema),
});

export const weekMenuResponseSchema = z.object({
  status: z.enum(["ok", "blocked", "requires_clarification"]),
  message: z.string().optional(),
  clarification_questions: z.array(z.string()).optional(),
  days: z.array(weekDaySchema).optional(),
});

export type WeekMenuResponse = z.infer<typeof weekMenuResponseSchema>;
