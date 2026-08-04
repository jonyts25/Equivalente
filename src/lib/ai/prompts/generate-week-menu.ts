export interface WeekMenuContext {
  patientName: string;
  dietSummary: string;
  equivalences: string;
  restrictions: string;
  preferences: string;
  forbiddenFoods: string;
  triggerFoods: string;
  forbiddenTreats: string;
  precisionMode: string;
}

export const WEEK_DAY_LABELS = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
] as const;

export function buildWeekMenuPrompt(ctx: WeekMenuContext): string {
  return `Eres un asistente para Equivalente. NO inventes dietas. Genera un MENÚ SEMANAL (7 días) usando SOLO la dieta base y equivalencias permitidas.

Paciente: ${ctx.patientName}
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
  "days": [
    {
      "day_number": 1,
      "day_label": "Lunes",
      "meals": [
        {
          "meal_slot": "Desayuno | Colación | Comida | Cena | ...",
          "title": "string",
          "ingredients": [{ "name": "string", "portion": "string", "notes": "string" }],
          "preparation": "string",
          "notes": "string opcional"
        }
      ]
    }
  ]
}

Reglas:
- Incluye exactamente 7 días: Lunes a Domingo (day_number 1..7 con day_label correcto).
- Variedad real entre días: no repitas la misma combinación todos los días salvo que la dieta base lo indique explícitamente.
- Respeta y rota entre las opciones YA definidas en la dieta base. No inventes platos nuevos fuera de esa dieta.
- Usa equivalencias permitidas solo para variar dentro de lo autorizado.
- Respeta restricciones clínicas y evita alimentos prohibidos / gustos prohibidos / detonantes.
- Si hay ambigüedad o falta información crítica, usa status "requires_clarification" (o "blocked" si no es seguro).
- Cada comida debe listar porciones claras en ingredients.
- No agregues texto fuera del JSON.`;
}

/** Prompt for a single day of the weekly menu (worker processes 7 of these). */
export function buildSingleWeekDayPrompt(
  ctx: WeekMenuContext,
  dayNumber: number,
  dayLabel: string
): string {
  return `Eres un asistente para Equivalente. NO inventes dietas. Genera SOLO el menú del día ${dayLabel} (día ${dayNumber} de la semana) usando SOLO la dieta base y equivalencias permitidas.

Paciente: ${ctx.patientName}
Modo precisión: ${ctx.precisionMode}
Día a generar: ${dayLabel} (day_number=${dayNumber})

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

Devuelve SOLO JSON válido con la forma de UN día (no la semana completa):
{
  "day_number": ${dayNumber},
  "day_label": "${dayLabel}",
  "meals": [
    {
      "meal_slot": "Desayuno | Colación | Comida | Cena | ...",
      "title": "string",
      "ingredients": [{ "name": "string", "portion": "string", "notes": "string" }],
      "preparation": "string",
      "notes": "string opcional"
    }
  ]
}

Reglas:
- Incluye TODOS los tiempos de comida del día según la dieta base (desayuno, colaciones, comida, cena, etc.).
- day_number debe ser ${dayNumber} y day_label debe ser exactamente "${dayLabel}".
- Respeta y elige entre las opciones YA definidas en la dieta base. No inventes platos nuevos fuera de esa dieta.
- Usa equivalencias permitidas solo para variar dentro de lo autorizado.
- Respeta restricciones clínicas y evita alimentos prohibidos / gustos prohibidos / detonantes.
- Cada comida debe listar porciones claras en ingredients.
- No agregues texto fuera del JSON.
- No envuelvas el día en un objeto "days" ni en status de semana: responde SOLO el objeto del día.`;
}
