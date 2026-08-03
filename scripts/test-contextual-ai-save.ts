/**
 * Unit tests: contextual AI draft save helpers and patient visibility (no DB).
 */
import {
  IA_LOCAL_SOURCE,
  assertNotAutoApproved,
  buildContextualDraftContentJson,
  buildContextualDraftTitle,
  isMenuVisibleToPatient,
  mapIntentionToGenerationType,
  resolveContextualDraftStatus,
} from "../src/lib/ai/contextual-draft";

let failed = 0;

function assert(name: string, condition: boolean, detail?: string) {
  if (!condition) {
    failed++;
    console.log("FAIL", name, detail ?? "");
  } else {
    console.log("PASS", name);
  }
}

const sampleResponse = {
  intencion: "sustitucion_alimento",
  alimentos_detectados: ["tortilla", "arroz"],
  respuesta_paciente: "Según la tabla demo, podrían equivaler con revisión.",
  requiere_revision_nutriologa: true,
  motivo_revision: "Validar porción exacta.",
  confianza: 0.62,
  flags: ["requires_professional_review"],
  contextCompleteness: { hasEquivalences: true },
  contexto: { equivalenceGroupCount: 3 },
  provider: "ollama_local",
  model: "gemma3:4b",
};

// 1. Generation type mapping
assert("sustitucion -> meal_options", mapIntentionToGenerationType("sustitucion_alimento") === "meal_options");
assert("antojo -> craving", mapIntentionToGenerationType("antojo") === "craving");
assert("ingredientes -> ingredients", mapIntentionToGenerationType("ingrediente_disponible") === "ingredients");

// 2. Status never approved from IA local save kinds
const draftStatus = resolveContextualDraftStatus("menu_draft");
const pendingStatus = resolveContextualDraftStatus("pending_suggestion");
assert("menu_draft status is draft", draftStatus === "draft");
assert("pending_suggestion status is pending_review", pendingStatus === "pending_review");
assert("draft is not approved", draftStatus !== "approved");
assert("pending is not approved", pendingStatus !== "approved");

let threw = false;
try {
  assertNotAutoApproved("approved");
} catch {
  threw = true;
}
assert("assertNotAutoApproved blocks approved", threw);

// 3. content_json preserves metadata
const content = buildContextualDraftContentJson({
  saveKind: "menu_draft",
  preguntaOriginal: "¿Puedo cambiar 2 tortillas por arroz?",
  aiResponse: sampleResponse,
});
assert("content source", content.source === IA_LOCAL_SOURCE);
assert("content provider", content.provider === "ollama_local");
assert("content model", content.model === "gemma3:4b");
assert("content flags", Array.isArray(content.flags) && (content.flags as string[]).length === 1);
assert("content confianza", content.confianza === 0.62);
assert("content completeness", (content.contextCompleteness as { hasEquivalences: boolean }).hasEquivalences === true);
assert("content pregunta", content.preguntaOriginal === "¿Puedo cambiar 2 tortillas por arroz?");

// 4. Title generation
const title = buildContextualDraftTitle(
  "¿Puedo cambiar 2 tortillas por arroz?",
  "sustitucion_alimento",
  "menu_draft"
);
assert("title includes IA local", title.includes("[IA local"));
assert("title includes pregunta fragment", title.includes("tortillas"));

// 5. Patient visibility — draft never visible
assert(
  "draft hidden from patient",
  !isMenuVisibleToPatient({
    status: "draft",
    content_json: content as Record<string, unknown>,
  })
);

// 6. IA pending_review hidden from patient until approved
assert(
  "ia pending_review hidden from patient",
  !isMenuVisibleToPatient({
    status: "pending_review",
    content_json: content as Record<string, unknown>,
  })
);

// 7. Approved IA draft visible to patient (after nutriologist approves)
assert(
  "approved ia visible to patient",
  isMenuVisibleToPatient({
    status: "approved",
    content_json: content as Record<string, unknown>,
  })
);

// 8. Non-IA pending_review still visible (manual flow)
assert(
  "manual pending_review visible",
  isMenuVisibleToPatient({
    status: "pending_review",
    content_json: { source: "manual_chatgpt" },
  })
);

// 9. Simulate nutritionist vs admin save payload parity
const adminContent = buildContextualDraftContentJson({
  saveKind: "ia_note",
  preguntaOriginal: "Tengo antojo de mazapán",
  aiResponse: {
    ...sampleResponse,
    intencion: "antojo",
    debug: { rawContent: "raw llm output" },
  },
  includeDebug: true,
});
assert("admin debug included", Boolean((adminContent.debug as { rawContent?: string })?.rawContent));

const nutriContent = buildContextualDraftContentJson({
  saveKind: "ia_note",
  preguntaOriginal: "Tengo antojo de mazapán",
  aiResponse: { ...sampleResponse, intencion: "antojo", debug: { rawContent: "secret" } },
  includeDebug: false,
});
assert("nutri no debug", nutriContent.debug === undefined);

console.log(`\nContextual AI save tests complete. Failures: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
