/**
 * Unit tests for nutrition safety rules (no Ollama required).
 */
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

const permissiveModelOutput = normalizeEquivalentePayload({
  intencion: "sustitucion_alimento",
  alimentos_detectados: ["tortillas", "arroz"],
  respuesta_paciente: "¡Claro que sí! Puedes cambiar 2 tortillas por arroz sin problema.",
  requiere_revision_nutriologa: false,
  motivo_revision: "",
  confianza: 0.95,
});

const hardened = applyNutritionSafetyRules(permissiveModelOutput);

assert("sustitucion forces review without equivalence table", hardened.requiere_revision_nutriologa === true);
assert("sustitucion caps confidence", hardened.confianza <= 0.65);
assert("sustitucion rewrites permissive language", !/claro que s[ií]/i.test(hardened.respuesta_paciente));
assert("sustitucion has motivo_revision", hardened.motivo_revision.length > 0);
assert("sustitucion has flags", hardened.flags.includes("requires_professional_review"));
assert("permissive corrected flag", hardened.flags.includes("permissive_response_corrected"));
assert("confidence clamped 0-1", hardened.confianza >= 0 && hardened.confianza <= 1);
assert("alimentos is array", Array.isArray(hardened.alimentos_detectados));

const invented = applyNutritionSafetyRules(
  normalizeEquivalentePayload({
    intencion: "duda_porcion",
    alimentos_detectados: ["tortilla", "arroz"],
    respuesta_paciente: "Una tortilla equivale a 30 gramos de arroz.",
    requiere_revision_nutriologa: false,
    motivo_revision: "",
    confianza: 0.9,
  })
);

assert("invented grams triggers flag", invented.flags.includes("possible_invented_equivalence"));
assert("invented grams requires review", invented.requiere_revision_nutriologa === true);

const antojo = applyNutritionSafetyRules(
  normalizeEquivalentePayload({
    intencion: "antojo",
    alimentos_detectados: ["mazapán"],
    respuesta_paciente: "Un pedacito no pasa nada.",
    requiere_revision_nutriologa: false,
    motivo_revision: "",
    confianza: 0.9,
  })
);

assert("antojo requires review without context", antojo.requiere_revision_nutriologa === true);
assert("antojo lowers confidence", antojo.confianza <= 0.65);

console.log(`\nSafety tests complete. Failures: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
