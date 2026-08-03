export interface MealOptionsContext {
  patientName: string;
  mealSlot: string;
  dietSummary: string;
  equivalences: string;
  restrictions: string;
  preferences: string;
  forbiddenFoods: string;
  triggerFoods: string;
  forbiddenTreats: string;
  precisionMode: string;
}

export function buildMealOptionsPrompt(ctx: MealOptionsContext): string {
  return `Eres un asistente para Equivalente. NO inventes dietas. Genera variaciones EQUIVALENTES dentro del plan.

Paciente: ${ctx.patientName}
Tiempo de comida: ${ctx.mealSlot}
Modo precisión: ${ctx.precisionMode}

Dieta base:
${ctx.dietSummary}

Equivalencias permitidas:
${ctx.equivalences}

Restricciones clínicas:
${ctx.restrictions}

Alimentos permitidos/preferidos:
${ctx.preferences}

Alimentos prohibidos clínicos:
${ctx.forbiddenFoods}

Alimentos detonantes (evitar o adaptar):
${ctx.triggerFoods}

Gustos prohibidos:
${ctx.forbiddenTreats}

Devuelve SOLO JSON válido:
{
  "status": "ok" | "blocked" | "requires_clarification",
  "message": "string opcional",
  "clarification_questions": ["string"],
  "options": [
    {
      "title": "string",
      "meal_slot": "string",
      "ingredients": [{ "name": "string", "portion": "string", "notes": "string" }],
      "preparation": "string",
      "replaces": "qué comida base reemplaza",
      "equivalences": [
        {
          "group": "protein | carb | fat | vegetable | other",
          "base": "string",
          "replacement": "string",
          "explanation": "string"
        }
      ],
      "warnings": ["string"],
      "requires_review": true,
      "confidence": "low | medium | high"
    }
  ]
}

Reglas:
- Cada opción debe explicar equivalencias y porciones.
- Respeta restricciones y evita alimentos prohibidos.
- Si hay ambigüedad, usa requires_clarification.
- Todas las opciones requieren revisión de nutriólogo (requires_review: true).
- No agregues texto fuera del JSON.`;
}
