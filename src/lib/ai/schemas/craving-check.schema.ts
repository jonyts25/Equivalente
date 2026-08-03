import { z } from "zod";
import { mealOptionSchema } from "./meal-options.schema";

export const cravingCheckResponseSchema = z.object({
  status: z.enum(["permitted", "blocked", "requires_clarification", "adapted_alternative"]),
  message: z.string(),
  clarification_questions: z.array(z.string()).optional(),
  alternative: mealOptionSchema.optional(),
  requires_review: z.boolean().default(true),
});

export type CravingCheckResponse = z.infer<typeof cravingCheckResponseSchema>;
