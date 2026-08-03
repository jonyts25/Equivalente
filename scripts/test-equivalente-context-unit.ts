/**
 * Unit tests: context mapping, prompts, safety with fixtures (no Ollama/DB).
 */
import { summarizeContextForClient } from "../src/lib/ai/equivalente-context";
import type { EquivalenteNutritionContext } from "../src/lib/ai/equivalente-context";
import {
  detectForbiddenTreatInQuestion,
  toPilotSafetyContext,
} from "../src/lib/ai/prompts/equivalente-contextual";
import {
  applyNutritionSafetyRules,
  normalizeEquivalentePayload,
} from "../src/lib/ai/nutrition-safety";

let failed = 0;

function assert(name: string, condition: boolean, detail?: string) {
  if (!condition) {
    failed++;
    console.log("FAIL", name, detail ?? "");
  } else {
    console.log("PASS", name);
  }
}

const baseContext: EquivalenteNutritionContext = {
  patient: {
    id: "demo-patient",
    fullName: "Paciente Demo",
    goal: "Control de peso",
    precisionMode: "strict",
  },
  dietPlan: { id: "diet-1", title: "Dieta demo", status: "active" },
  mealSlot: {
    id: "slot-1",
    name: "Comida",
    notes: "2 proteína + 1 carb",
    requirements: { carbUnits: 1, proteinUnits: 2 },
  },
  equivalences: [],
  preferences: [{ foodName: "Pollo", preference: "love", strictness: null, notes: null }],
  forbiddenTreats: [
    {
      name: "Mazapán de chocolate",
      mode: "exact_portion_required",
      triggerRisk: 5,
      ambiguityRequired: true,
    },
  ],
  contextCompleteness: {
    hasActiveDiet: true,
    hasMealSlot: true,
    hasEquivalences: false,
    hasPreferences: true,
    hasForbiddenTreats: true,
  },
};

assert("summarize context", summarizeContextForClient(baseContext).hasActiveDiet === true);
assert("completeness has forbidden", baseContext.contextCompleteness.hasForbiddenTreats);

const safetyCtx = toPilotSafetyContext(baseContext, "¿Puedo cambiar 2 tortillas por arroz?");
assert("no equiv table in safety ctx", safetyCtx.hasEquivalenceTable === false);
assert("has diet in safety ctx", safetyCtx.hasDietContext === true);
assert("has meal in safety ctx", safetyCtx.hasMealContext === true);

const withEquiv: EquivalenteNutritionContext = {
  ...baseContext,
  equivalences: [
    {
      groupName: "Carbohidratos",
      category: "carb",
      items: [
        { foodName: "Tortilla", portionLabel: "1 pieza", grams: 25, units: 1 },
        { foodName: "Arroz", portionLabel: "1/2 taza cocido", grams: 100, units: 1 },
      ],
    },
  ],
  contextCompleteness: {
    ...baseContext.contextCompleteness,
    hasEquivalences: true,
  },
};

assert("with equivalences flag", withEquiv.contextCompleteness.hasEquivalences);
const safetyWithEquiv = toPilotSafetyContext(withEquiv, "¿Puedo cambiar 2 tortillas por arroz?");
assert("equiv table true", safetyWithEquiv.hasEquivalenceTable === true);

const forbidden = detectForbiddenTreatInQuestion(withEquiv, "Tengo antojo de mazapán");
assert("detect mazapan forbidden", forbidden !== null);

const subResult = applyNutritionSafetyRules(
  normalizeEquivalentePayload({
    intencion: "sustitucion_alimento",
    alimentos_detectados: ["tortillas", "arroz"],
    respuesta_paciente: "Claro que sí, cambia libremente.",
    requiere_revision_nutriologa: false,
    motivo_revision: "",
    confianza: 0.95,
  }),
  toPilotSafetyContext(baseContext, "¿Puedo cambiar 2 tortillas por arroz?")
);
assert("contextual sub still requires review without equiv", subResult.requiere_revision_nutriologa === true);
assert("contextual sub caps confidence", subResult.confianza <= 0.65);

console.log(`\nContext unit tests complete. Failures: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
