import type { EquivalenteNutritionContext } from "../equivalente-context";

export function buildEquivalenteContextualSystemPrompt(
  ctx: EquivalenteNutritionContext
): string {
  const precisionNote =
    ctx.patient.precisionMode === "strict"
      ? "precision_mode=strict: pide más detalle ante porciones ambiguas."
      : ctx.patient.precisionMode === "relaxed"
        ? "precision_mode=relaxed: cautela moderada, pero sin inventar equivalencias."
        : "precision_mode=normal: equilibrio entre utilidad y cautela.";

  return `Eres un asistente de apoyo nutricional para Equivalente (México).

REGLAS ESTRICTAS:
- Responde ÚNICAMENTE con JSON válido, sin markdown.
- NO reemplazas a una nutrióloga ni apruebas clínicamente.
- NO das diagnóstico médico.
- Usa ÚNICAMENTE la dieta, comida (meal slot) y equivalencias provistas en el contexto.
- Si una equivalencia NO está en el contexto, NO la inventes.
- Si el paciente pregunta sustituir alimentos y no hay equivalencia explícita en el contexto, requiere_revision_nutriologa=true.
- Si hay equivalencia explícita en el contexto, puedes orientar con la tabla; indica que debe validarse con nutrióloga.
- Si el grupo de equivalencias incluye "demo" en el nombre o notas, aclara que son datos demo, no prescripción clínica.
- Aunque exista tabla de equivalencias, requiere_revision_nutriologa=true salvo que cantidad y plan estén totalmente claros.
- ${precisionNote}
- Si el alimento aparece en forbiddenTreats, aplica cautela extra; no lo integres al plan sin revisión/porción.
- No regañes. No sugieras ayunos, castigos ni compensaciones extremas.
- Tono amable en español mexicano.

Campos JSON requeridos:
{
  "intencion": "sustitucion_alimento | duda_porcion | antojo | ingrediente_disponible | otro",
  "alimentos_detectados": ["..."],
  "respuesta_paciente": "...",
  "requiere_revision_nutriologa": true/false,
  "motivo_revision": "...",
  "confianza": 0.0-1.0
}`;
}

export function buildEquivalenteContextualUserPrompt(
  ctx: EquivalenteNutritionContext,
  texto: string,
  hintIntencion?: string
): string {
  const contextJson = JSON.stringify(
    {
      patient: ctx.patient,
      dietPlan: ctx.dietPlan,
      mealSlot: ctx.mealSlot,
      equivalences: ctx.equivalences,
      preferences: ctx.preferences,
      forbiddenTreats: ctx.forbiddenTreats,
      contextCompleteness: ctx.contextCompleteness,
    },
    null,
    2
  );

  const hint = hintIntencion ? `\nPista de intención: ${hintIntencion}.` : "";

  return `CONTEXTO NUTRICIONAL DEL PACIENTE (usar solo esto, no inventar fuera):
${contextJson}

CONSULTA DEL PACIENTE:
"${texto.trim()}"${hint}

Responde solo JSON.`;
}

export function toPilotSafetyContext(
  ctx: EquivalenteNutritionContext,
  texto: string
) {
  const hasQuantityInQuestion = /\d+\s*(g|gr|gramos?|tortilla|pieza|taza|cucharada|ml|cc)\b/i.test(
    texto
  );
  const hasTargetQuantity =
    hasQuantityInQuestion &&
    ctx.contextCompleteness.hasEquivalences &&
    ctx.equivalences.some((g) =>
      g.items.some((i) => i.grams != null || i.units != null)
    );

  return {
    hasEquivalenceTable: ctx.contextCompleteness.hasEquivalences,
    hasDietContext: ctx.contextCompleteness.hasActiveDiet,
    hasMealContext: ctx.contextCompleteness.hasMealSlot,
    hasExactQuantity: hasTargetQuantity,
  };
}

export function detectForbiddenTreatInQuestion(
  ctx: EquivalenteNutritionContext,
  texto: string
): string | null {
  const normalized = texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  for (const treat of ctx.forbiddenTreats) {
    const treatNorm = treat.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    if (normalized.includes(treatNorm) || treatNorm.includes(normalized.split(/\s+/)[0] ?? "")) {
      return treat.name;
    }
    const keyword = treatNorm.split(/\s+/)[0];
    if (keyword.length >= 4 && normalized.includes(keyword)) {
      return treat.name;
    }
  }
  return null;
}
