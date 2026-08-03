/**
 * Demo equivalence scenarios — safety + context mapping (no Ollama/DB).
 */
import type { EquivalenteNutritionContext } from "../src/lib/ai/equivalente-context";
import { summarizeContextForClient } from "../src/lib/ai/equivalente-context";
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

const DEMO_NOTES = "Demo para pruebas. Validar con nutrióloga antes de uso clínico.";

const demoContext: EquivalenteNutritionContext = {
  patient: {
    id: "3bc09223-6dd6-4181-a855-14ed52c80c54",
    fullName: "Paciente Demo",
    goal: "Control de peso",
    precisionMode: "strict",
  },
  dietPlan: { id: "diet-demo", title: "Dieta demo semanal", status: "active" },
  mealSlot: {
    id: "slot-comida",
    name: "Comida",
    notes: "2 proteína + 1 carb + verdura",
    requirements: { carbUnits: 1, proteinUnits: 2, fatUnits: 1 },
  },
  equivalences: [
    {
      groupName: "Carbohidratos demo",
      category: "carb",
      items: [
        { foodName: "tortilla", portionLabel: "1 pieza", grams: 25, units: 1, notes: "Demo" },
        { foodName: "arroz", portionLabel: "1/2 taza cocido", grams: 100, units: 1, notes: "Demo" },
        { foodName: "avena", portionLabel: "1/3 taza cruda", grams: 40, units: 1, notes: "Demo" },
        { foodName: "pan integral", portionLabel: "1 rebanada", grams: 30, units: 1, notes: "Demo" },
      ],
    },
    {
      groupName: "Proteínas demo",
      category: "protein",
      items: [
        { foodName: "pollo", portionLabel: "120 g cocido", grams: 120, units: 1, notes: "Demo" },
        { foodName: "huevo", portionLabel: "2 piezas", grams: 100, units: 2, notes: "Demo" },
        { foodName: "aguacate", portionLabel: "1/4 pieza", grams: 40, units: 1, notes: "Demo" },
      ],
    },
    {
      groupName: "Grasas demo",
      category: "fat",
      items: [
        { foodName: "aguacate", portionLabel: "1/4 pieza", grams: 40, units: 1, notes: "Demo" },
        { foodName: "aceite de oliva", portionLabel: "1 cucharadita", grams: 5, units: 1, notes: "Demo" },
      ],
    },
  ],
  preferences: [{ foodName: "Pollo", preference: "love", strictness: null, notes: null }],
  forbiddenTreats: [
    {
      name: "Mazapán de chocolate",
      mode: "exact_portion_required",
      triggerRisk: 5,
      ambiguityRequired: true,
      notes: DEMO_NOTES,
    },
  ],
  contextCompleteness: {
    hasActiveDiet: true,
    hasMealSlot: true,
    hasEquivalences: true,
    hasPreferences: true,
    hasForbiddenTreats: true,
  },
};

const summary = summarizeContextForClient(demoContext);
assert("demo summary group count", summary.equivalenceGroupCount === 3);
assert("demo summary item count", summary.equivalenceItemCount === 9);
assert("demo flag", summary.hasDemoEquivalences === true);

// Caso 1: ¿Puedo cambiar 2 tortillas por arroz?
const q1 = "¿Puedo cambiar 2 tortillas por arroz?";
const ctx1 = toPilotSafetyContext(demoContext, q1);
assert("caso1 has equiv table", ctx1.hasEquivalenceTable === true);
assert("caso1 no missing equiv flag context", ctx1.hasEquivalenceTable);

const r1 = applyNutritionSafetyRules(
  normalizeEquivalentePayload({
    intencion: "sustitucion_alimento",
    alimentos_detectados: ["tortilla", "arroz"],
    respuesta_paciente: "Sí, puedes cambiar sin problema, es lo mismo.",
    requiere_revision_nutriologa: false,
    motivo_revision: "",
    confianza: 0.95,
  }),
  ctx1
);
assert("caso1 requires review", r1.requiere_revision_nutriologa === true);
assert("caso1 no missing_equiv flag", !r1.flags.includes("missing_equivalence_table"));
assert("caso1 confidence capped", r1.confianza <= 0.62);
assert("caso1 no absolute approval", !/sin problema|libremente|claro que sí/i.test(r1.respuesta_paciente));

// Caso 2: ¿Cuánto arroz equivale a una tortilla?
const q2 = "¿Cuánto arroz equivale a una tortilla?";
const ctx2 = toPilotSafetyContext(demoContext, q2);
const r2 = applyNutritionSafetyRules(
  normalizeEquivalentePayload({
    intencion: "duda_porcion",
    alimentos_detectados: ["tortilla", "arroz"],
    respuesta_paciente: "1 tortilla equivale exactamente a 1/2 taza de arroz según tu plan aprobado.",
    requiere_revision_nutriologa: false,
    motivo_revision: "",
    confianza: 1,
  }),
  ctx2
);
assert("caso2 requires review with demo", r2.requiere_revision_nutriologa === true);
assert("caso2 confidence not 1", r2.confianza < 1);
assert("caso2 no missing equiv", !r2.flags.includes("missing_equivalence_table"));

// Caso 3: Tengo antojo de mazapán
const q3 = "Tengo antojo de mazapán";
const forbidden = detectForbiddenTreatInQuestion(demoContext, q3);
assert("caso3 detects mazapan", forbidden !== null);
const r3 = applyNutritionSafetyRules(
  normalizeEquivalentePayload({
    intencion: "antojo",
    alimentos_detectados: ["mazapán"],
    respuesta_paciente: "Claro que sí, el mazapán es una buena opción saludable en tu plan.",
    requiere_revision_nutriologa: false,
    motivo_revision: "",
    confianza: 0.8,
  }),
  toPilotSafetyContext(demoContext, q3)
);
assert("caso3 requires review", r3.requiere_revision_nutriologa === true);
assert("caso3 no healthy equiv", !/opción saludable|equivalente/i.test(r3.respuesta_paciente));

// Caso 4: Solo tengo pollo, huevo y aguacate
const q4 = "Solo tengo pollo, huevo y aguacate, ¿qué puedo cenar?";
const ctx4 = toPilotSafetyContext(demoContext, q4);
assert("caso4 has diet", ctx4.hasDietContext === true);
const r4 = applyNutritionSafetyRules(
  normalizeEquivalentePayload({
    intencion: "ingrediente_disponible",
    alimentos_detectados: ["pollo", "huevo", "aguacate"],
    respuesta_paciente: "Cena 300g de pollo con 5 huevos y medio aguacate, está perfecto.",
    requiere_revision_nutriologa: false,
    motivo_revision: "",
    confianza: 0.9,
  }),
  ctx4
);
assert("caso4 requires review", r4.requiere_revision_nutriologa === true);
assert("caso4 corrected permissive", r4.confianza <= 0.65);

// Caso 5: No tengo avena
const q5 = "No tengo avena, ¿qué puedo usar?";
const ctx5 = toPilotSafetyContext(demoContext, q5);
assert("caso5 has carb equiv", ctx5.hasEquivalenceTable === true);
const r5 = applyNutritionSafetyRules(
  normalizeEquivalentePayload({
    intencion: "sustitucion_alimento",
    alimentos_detectados: ["avena"],
    respuesta_paciente: "Claro que sí, usa mazapán o tortilla; cualquiera sirve sin problema.",
    requiere_revision_nutriologa: false,
    motivo_revision: "",
    confianza: 0.85,
  }),
  ctx5
);
assert("caso5 requires review", r5.requiere_revision_nutriologa === true);
assert("caso5 no mazapan suggestion", !/mazapán|mazapan/i.test(r5.respuesta_paciente));
assert("caso5 has equiv context", !r5.flags.includes("missing_equivalence_table"));

console.log(`\nDemo equivalence context tests complete. Failures: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
