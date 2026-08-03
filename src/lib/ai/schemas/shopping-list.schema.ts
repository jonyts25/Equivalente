import { z } from "zod";

export const shoppingListResponseSchema = z.object({
  status: z.literal("ok"),
  items: z.array(
    z.object({
      name: z.string(),
      quantity: z.string(),
      category: z.string().optional(),
      notes: z.string().optional(),
    })
  ),
});

export type ShoppingListResponse = z.infer<typeof shoppingListResponseSchema>;
