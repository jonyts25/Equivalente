export interface ShoppingListContext {
  patientName: string;
  menusSummary: string;
  days: number;
}

export function buildShoppingListPrompt(ctx: ShoppingListContext): string {
  return `Genera lista de súper basada en menús aprobados/equivalentes. NO inventes dietas.

Paciente: ${ctx.patientName}
Días: ${ctx.days}

Menús:
${ctx.menusSummary}

Devuelve SOLO JSON:
{
  "status": "ok",
  "items": [
    { "name": "string", "quantity": "string", "category": "string", "notes": "string" }
  ]
}`;
}
