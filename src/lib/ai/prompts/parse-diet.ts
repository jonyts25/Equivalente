export function buildParseDietPrompt(rawDiet: string): string {
  return `Eres un asistente nutricional. NO inventes dietas clínicas. Solo estructura la dieta prescrita en JSON.

Dieta base (texto del nutriólogo):
"""
${rawDiet}
"""

Devuelve SOLO JSON válido con esta estructura:
{
  "status": "ok" | "requires_clarification",
  "title": "string",
  "meal_slots": [
    {
      "name": "Desayuno | Colación AM | Comida | Colación PM | Cena",
      "slot_order": 1,
      "notes": "string opcional",
      "requirements": {
        "protein_units": number | null,
        "carb_units": number | null,
        "fat_units": number | null,
        "vegetable_rule": "string | null",
        "calories_target": number | null,
        "protein_target": number | null,
        "notes": "string opcional"
      }
    }
  ],
  "notes": "string opcional",
  "clarification_questions": ["string"]
}

Reglas:
- No modifiques objetivos clínicos.
- Si falta información crítica, usa status requires_clarification.
- No agregues texto fuera del JSON.`;
}
