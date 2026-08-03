export interface EquivalentePilotContext {
  hasEquivalenceTable?: boolean;
  hasDietContext?: boolean;
  hasExactQuantity?: boolean;
  hasMealContext?: boolean;
}

export const EQUIVALENTE_INTENTIONS = [
  "sustitucion_alimento",
  "duda_porcion",
  "antojo",
  "ingrediente_disponible",
  "otro",
] as const;

export type EquivalenteIntention = (typeof EQUIVALENTE_INTENTIONS)[number];

export const NUTRITION_SAFETY_FLAGS = [
  "missing_equivalence_table",
  "missing_diet_context",
  "missing_exact_quantity",
  "missing_meal_context",
  "requires_professional_review",
  "permissive_response_corrected",
  "low_confidence",
  "possible_invented_equivalence",
] as const;

export type NutritionSafetyFlag = (typeof NUTRITION_SAFETY_FLAGS)[number];

export interface EquivalenteAiPayload {
  intencion: EquivalenteIntention;
  alimentos_detectados: string[];
  respuesta_paciente: string;
  requiere_revision_nutriologa: boolean;
  motivo_revision: string;
  confianza: number;
}

export interface NutritionSafetyResult extends EquivalenteAiPayload {
  flags: NutritionSafetyFlag[];
}

const DEFAULT_CONTEXT: Required<EquivalentePilotContext> = {
  hasEquivalenceTable: false,
  hasDietContext: false,
  hasExactQuantity: false,
  hasMealContext: false,
};

const PERMISSIVE_PATTERNS: RegExp[] = [
  /claro que s[ií]/i,
  /sin problema/i,
  /puedes cambiar/i,
  /puedes\s+(sustituir|reemplazar)/i,
  /no hay problema/i,
  /adelante,?\s+puedes/i,
  /s[ií],?\s+puedes/i,
  /totalmente\s+(s[ií]|ok|bien)/i,
  /libremente\s+(puedes|est[aá]\s+bien)/i,
  /no pasa nada/i,
  /est[aá]\s+bien\s+cambiar/i,
];

const EXACT_GRAM_PATTERNS = [
  /\b\d+\s*(g|gr|gramos?)\b/i,
  /\b\d+\s*(ml|cc)\b/i,
  /\bequivale?\s+a\s+\d+/i,
  /\bexactamente\s+\d+/i,
];

const REVISION_MOTIVO_SUSTITUCION =
  "Faltan tabla de equivalencias, cantidad exacta de arroz y contexto del plan alimenticio.";

const REVISION_MOTIVO_DEMO_EQUIV =
  "Equivalencias demo cargadas; validar cantidad exacta y plan con tu nutrióloga antes de aplicar.";

const REVISION_MOTIVO_GENERAL =
  "Falta contexto clínico, dieta o equivalencias para responder con seguridad.";

const REVISION_MOTIVO_PERMISIVO =
  "La respuesta original era demasiado permisiva; se requiere confirmación de la nutrióloga.";

function normalizeIntention(raw: unknown): EquivalenteIntention {
  const value = String(raw ?? "otro");
  if (EQUIVALENTE_INTENTIONS.includes(value as EquivalenteIntention)) {
    return value as EquivalenteIntention;
  }
  return "otro";
}

function normalizeFoods(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(String).filter(Boolean);
}

export function clampConfidence(value: unknown, fallback = 0.4): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(1, Math.max(0, n));
}

export function hasPermissiveLanguage(text: string): boolean {
  return PERMISSIVE_PATTERNS.some((pattern) => pattern.test(text));
}

function mayInventExactEquivalence(text: string, intencion: EquivalenteIntention): boolean {
  if (intencion !== "sustitucion_alimento" && intencion !== "duda_porcion") return false;
  return EXACT_GRAM_PATTERNS.some((pattern) => pattern.test(text));
}

function buildContextualSubstitutionResponse(alimentos: string[]): string {
  if (alimentos.length >= 2) {
    return `Según la tabla de equivalencias demo, ${alimentos[0]} y ${alimentos[1]} pueden equivaler en tu plan, pero tu nutrióloga debe confirmar la porción exacta. Estos datos son demo y no sustituyen validación clínica.`;
  }
  return "Hay equivalencias demo cargadas, pero tu nutrióloga debe confirmar porción y plan antes de cambiar alimentos.";
}

function buildCautiousSubstitutionResponse(alimentos: string[]): string {
  if (alimentos.length >= 2) {
    return `Puede ser posible, pero necesito revisar la porción indicada en tu dieta o la tabla de equivalencias de tu nutrióloga. No conviene cambiar ${alimentos[0]} por ${alimentos[1]} libremente porque la equivalencia depende de la cantidad y del plan.`;
  }
  return "Puede ser posible, pero necesito revisar la porción indicada en tu dieta o la tabla de equivalencias de tu nutrióloga. No conviene sustituir alimentos libremente porque la equivalencia depende de la cantidad y del plan.";
}

function buildCautiousGeneralResponse(intencion: EquivalenteIntention): string {
  switch (intencion) {
    case "antojo":
      return "Entiendo el antojo. Antes de decidir, conviene revisar porción y cómo encaja con tu plan; tu nutrióloga puede orientarte mejor.";
    case "ingrediente_disponible":
      return "Con los ingredientes que tienes se pueden plantear ideas generales, pero necesito que tu nutrióloga confirme porciones y equivalencias según tu dieta.";
    case "duda_porcion":
      return "La porción exacta importa mucho. Te recomiendo confirmar con tu nutrióloga antes de contarlo como parte de tu plan.";
    case "otro":
      return "Puedo orientarte de forma general: retoma tu plan en la siguiente comida sin compensaciones extremas. Si tienes dudas, confirma con tu nutrióloga.";
    default:
      return "Puedo orientarte de forma general, pero tu nutrióloga debe confirmar esto según tu plan y porciones.";
  }
}

function lacksClinicalContext(context: Required<EquivalentePilotContext>): boolean {
  return (
    !context.hasEquivalenceTable ||
    !context.hasDietContext ||
    !context.hasExactQuantity ||
    !context.hasMealContext
  );
}

function intentionNeedsReviewByDefault(intencion: EquivalenteIntention): boolean {
  return (
    intencion === "sustitucion_alimento" ||
    intencion === "duda_porcion" ||
    intencion === "antojo" ||
    intencion === "ingrediente_disponible"
  );
}

function computeFlags(input: {
  payload: EquivalenteAiPayload;
  context: Required<EquivalentePilotContext>;
  permissiveCorrected: boolean;
  inventedEquivalence: boolean;
}): NutritionSafetyFlag[] {
  const flags = new Set<NutritionSafetyFlag>();

  if (!input.context.hasEquivalenceTable) flags.add("missing_equivalence_table");
  if (!input.context.hasDietContext) flags.add("missing_diet_context");
  if (!input.context.hasExactQuantity) flags.add("missing_exact_quantity");
  if (!input.context.hasMealContext) flags.add("missing_meal_context");
  if (input.payload.requiere_revision_nutriologa) flags.add("requires_professional_review");
  if (input.permissiveCorrected) flags.add("permissive_response_corrected");
  if (input.payload.confianza <= 0.65) flags.add("low_confidence");
  if (input.inventedEquivalence) flags.add("possible_invented_equivalence");

  return NUTRITION_SAFETY_FLAGS.filter((f) => flags.has(f));
}

export function normalizeEquivalentePayload(
  raw: Record<string, unknown>
): EquivalenteAiPayload {
  return {
    intencion: normalizeIntention(raw.intencion),
    alimentos_detectados: normalizeFoods(raw.alimentos_detectados),
    respuesta_paciente: String(raw.respuesta_paciente ?? "").trim(),
    requiere_revision_nutriologa: Boolean(raw.requiere_revision_nutriologa),
    motivo_revision: String(raw.motivo_revision ?? "").trim(),
    confianza: clampConfidence(raw.confianza),
  };
}

export function applyNutritionSafetyRules(
  payload: EquivalenteAiPayload,
  context: EquivalentePilotContext = DEFAULT_CONTEXT
): NutritionSafetyResult {
  const ctx: Required<EquivalentePilotContext> = {
    hasEquivalenceTable: context.hasEquivalenceTable ?? false,
    hasDietContext: context.hasDietContext ?? false,
    hasExactQuantity: context.hasExactQuantity ?? false,
    hasMealContext: context.hasMealContext ?? false,
  };

  const { intencion, alimentos_detectados } = payload;
  const originalResponse = payload.respuesta_paciente;

  let {
    respuesta_paciente,
    requiere_revision_nutriologa,
    motivo_revision,
    confianza,
  } = payload;

  let permissiveCorrected = false;
  const missingContext = lacksClinicalContext(ctx);

  if (intencion === "sustitucion_alimento" && !ctx.hasEquivalenceTable) {
    requiere_revision_nutriologa = true;
    confianza = Math.min(confianza, 0.65);
    motivo_revision = REVISION_MOTIVO_SUSTITUCION;
    if (missingContext || hasPermissiveLanguage(respuesta_paciente)) {
      respuesta_paciente = buildCautiousSubstitutionResponse(alimentos_detectados);
      if (respuesta_paciente !== originalResponse) permissiveCorrected = true;
    }
  }

  if (intencion === "sustitucion_alimento" && ctx.hasEquivalenceTable) {
    requiere_revision_nutriologa = true;
    confianza = Math.min(confianza, 0.62);
    if (!motivo_revision || motivo_revision === REVISION_MOTIVO_SUSTITUCION) {
      motivo_revision = REVISION_MOTIVO_DEMO_EQUIV;
    }
    if (hasPermissiveLanguage(respuesta_paciente)) {
      const rewritten = buildContextualSubstitutionResponse(alimentos_detectados);
      if (rewritten !== respuesta_paciente) {
        respuesta_paciente = rewritten;
        permissiveCorrected = true;
      }
    }
  }

  if (intencion === "duda_porcion" && ctx.hasEquivalenceTable && !ctx.hasExactQuantity) {
    requiere_revision_nutriologa = true;
    confianza = Math.min(confianza, 0.62);
    motivo_revision = motivo_revision || REVISION_MOTIVO_DEMO_EQUIV;
  }

  if (intencion === "duda_porcion" && missingContext && !ctx.hasEquivalenceTable) {
    requiere_revision_nutriologa = true;
    confianza = Math.min(confianza, 0.65);
    if (!motivo_revision) motivo_revision = REVISION_MOTIVO_SUSTITUCION;
  }

  if (
    (intencion === "antojo" || intencion === "ingrediente_disponible") &&
    missingContext
  ) {
    requiere_revision_nutriologa = true;
    confianza = Math.min(confianza, 0.65);
    if (!motivo_revision) motivo_revision = REVISION_MOTIVO_GENERAL;
  }

  if (intentionNeedsReviewByDefault(intencion) && missingContext && confianza > 0.65) {
    confianza = Math.min(confianza, 0.65);
    requiere_revision_nutriologa = true;
    if (!motivo_revision) motivo_revision = REVISION_MOTIVO_GENERAL;
  }

  const inventedEquivalence =
    !ctx.hasEquivalenceTable &&
    mayInventExactEquivalence(respuesta_paciente, intencion);

  if (inventedEquivalence) {
    requiere_revision_nutriologa = true;
    confianza = Math.min(confianza, 0.55);
    motivo_revision = motivo_revision || REVISION_MOTIVO_SUSTITUCION;
    if (intencion === "sustitucion_alimento" || intencion === "duda_porcion") {
      const rewritten = buildCautiousSubstitutionResponse(alimentos_detectados);
      if (rewritten !== respuesta_paciente) {
        permissiveCorrected = true;
        respuesta_paciente = rewritten;
      }
    }
  }

  const permissive = hasPermissiveLanguage(respuesta_paciente);
  if (
    permissive &&
    (requiere_revision_nutriologa || missingContext || intentionNeedsReviewByDefault(intencion))
  ) {
    requiere_revision_nutriologa = true;
    confianza = Math.min(confianza, 0.55);
    motivo_revision = motivo_revision || REVISION_MOTIVO_PERMISIVO;
    const before = respuesta_paciente;
    if (intencion === "sustitucion_alimento") {
      respuesta_paciente = ctx.hasEquivalenceTable
        ? buildContextualSubstitutionResponse(alimentos_detectados)
        : buildCautiousSubstitutionResponse(alimentos_detectados);
    } else {
      respuesta_paciente = buildCautiousGeneralResponse(intencion);
    }
    if (respuesta_paciente !== before) permissiveCorrected = true;
  }

  if (requiere_revision_nutriologa && confianza > 0.65) {
    confianza = Math.min(confianza, 0.65);
  }

  if (requiere_revision_nutriologa && !motivo_revision) {
    motivo_revision = REVISION_MOTIVO_GENERAL;
  }

  if (!requiere_revision_nutriologa && missingContext && intentionNeedsReviewByDefault(intencion)) {
    requiere_revision_nutriologa = true;
    confianza = Math.min(confianza, 0.55);
    motivo_revision = REVISION_MOTIVO_GENERAL;
  }

  const result: EquivalenteAiPayload = {
    intencion,
    alimentos_detectados,
    respuesta_paciente,
    requiere_revision_nutriologa,
    motivo_revision,
    confianza: clampConfidence(confianza),
  };

  return {
    ...result,
    flags: computeFlags({
      payload: result,
      context: ctx,
      permissiveCorrected,
      inventedEquivalence,
    }),
  };
}

export function confidenceLevel(confianza: number): "baja" | "media" | "alta" {
  if (confianza <= 0.55) return "baja";
  if (confianza <= 0.75) return "media";
  return "alta";
}
