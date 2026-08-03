import { z } from "zod";

export const parseDietSlotSchema = z.object({
  name: z.string(),
  slot_order: z.number(),
  notes: z.string().optional(),
  requirements: z
    .object({
      protein_units: z.number().nullable().optional(),
      carb_units: z.number().nullable().optional(),
      fat_units: z.number().nullable().optional(),
      vegetable_rule: z.string().nullable().optional(),
      calories_target: z.number().nullable().optional(),
      protein_target: z.number().nullable().optional(),
      notes: z.string().optional(),
    })
    .optional(),
});

export const parseDietResponseSchema = z.object({
  status: z.enum(["ok", "requires_clarification"]),
  title: z.string().optional(),
  meal_slots: z.array(parseDietSlotSchema).optional(),
  notes: z.string().optional(),
  clarification_questions: z.array(z.string()).optional(),
});

export type ParseDietResponse = z.infer<typeof parseDietResponseSchema>;
