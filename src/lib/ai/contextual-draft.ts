import type { EquivalenteIntention } from "@/lib/ai/nutrition-safety";
import type { GenerationType, MenuStatus } from "@/types/database";

export const IA_LOCAL_SOURCE = "ollama_local_contextual";

export type ContextualSaveKind = "ia_note" | "menu_draft" | "pending_suggestion";

export type ContextualAiDraftPayload = {
  intencion?: string;
  alimentos_detectados?: string[];
  respuesta_paciente?: string;
  requiere_revision_nutriologa?: boolean;
  motivo_revision?: string;
  confianza?: number;
  flags?: string[];
  contextCompleteness?: Record<string, unknown>;
  contexto?: Record<string, unknown>;
  provider?: string;
  model?: string;
  debug?: { rawContent?: string };
};

const INTENTION_LABELS: Record<string, string> = {
  sustitucion_alimento: "Sustitución",
  duda_porcion: "Porción",
  antojo: "Antojo",
  ingrediente_disponible: "Ingredientes",
  otro: "Consulta",
};

const SAVE_KIND_LABELS: Record<ContextualSaveKind, string> = {
  ia_note: "Nota IA",
  menu_draft: "Menú borrador",
  pending_suggestion: "Sugerencia pendiente",
};

export function mapIntentionToGenerationType(intencion: string): GenerationType {
  switch (intencion as EquivalenteIntention) {
    case "antojo":
      return "craving";
    case "ingrediente_disponible":
      return "ingredients";
    case "sustitucion_alimento":
    case "duda_porcion":
      return "meal_options";
    default:
      return "meal_options";
  }
}

export function resolveContextualDraftStatus(saveKind: ContextualSaveKind): MenuStatus {
  return saveKind === "pending_suggestion" ? "pending_review" : "draft";
}

export function assertNotAutoApproved(status: MenuStatus): void {
  if (status === "approved") {
    throw new Error("No se puede aprobar automáticamente desde IA local.");
  }
}

export function buildContextualDraftTitle(
  pregunta: string,
  intencion: string,
  saveKind: ContextualSaveKind
): string {
  const trimmed = pregunta.trim();
  const short = trimmed.length > 55 ? `${trimmed.slice(0, 55)}…` : trimmed;
  const intentLabel = INTENTION_LABELS[intencion] ?? "Consulta";
  const kindLabel = SAVE_KIND_LABELS[saveKind];
  return `[IA local · ${kindLabel}] ${intentLabel}: ${short}`;
}

export function buildContextualDraftContentJson(input: {
  saveKind: ContextualSaveKind;
  preguntaOriginal: string;
  aiResponse: ContextualAiDraftPayload;
  includeDebug?: boolean;
}): Record<string, unknown> {
  const { saveKind, preguntaOriginal, aiResponse, includeDebug } = input;
  const content: Record<string, unknown> = {
    source: IA_LOCAL_SOURCE,
    saveKind,
    preguntaOriginal,
    provider: aiResponse.provider ?? "ollama_local",
    model: aiResponse.model ?? null,
    intencion: aiResponse.intencion ?? "otro",
    alimentos_detectados: aiResponse.alimentos_detectados ?? [],
    flags: aiResponse.flags ?? [],
    confianza: aiResponse.confianza ?? null,
    requiere_revision_nutriologa: aiResponse.requiere_revision_nutriologa ?? true,
    motivo_revision: aiResponse.motivo_revision ?? null,
    contextCompleteness: aiResponse.contextCompleteness ?? null,
    contextoResumido: aiResponse.contexto ?? null,
    respuesta: {
      intencion: aiResponse.intencion,
      alimentos_detectados: aiResponse.alimentos_detectados,
      respuesta_paciente: aiResponse.respuesta_paciente,
      requiere_revision_nutriologa: aiResponse.requiere_revision_nutriologa,
      motivo_revision: aiResponse.motivo_revision,
      confianza: aiResponse.confianza,
      flags: aiResponse.flags,
    },
    savedAt: new Date().toISOString(),
    demoEquivalencesNote:
      "Si el contexto incluye equivalencias demo, deben validarse con nutrióloga antes de uso clínico.",
  };

  if (includeDebug && aiResponse.debug?.rawContent) {
    content.debug = { rawContent: aiResponse.debug.rawContent };
  }

  return content;
}

export function isIaLocalContextualDraft(contentJson: Record<string, unknown> | null | undefined): boolean {
  return contentJson?.source === IA_LOCAL_SOURCE;
}

export function isMenuVisibleToPatient(menu: {
  status: MenuStatus;
  content_json: Record<string, unknown>;
}): boolean {
  if (menu.status === "draft" || menu.status === "rejected" || menu.status === "blocked") {
    return false;
  }
  if (menu.status === "approved" || menu.status === "favorite") {
    return true;
  }
  if (menu.status === "pending_review") {
    return !isIaLocalContextualDraft(menu.content_json);
  }
  return false;
}

export function extractIaDraftSummary(contentJson: Record<string, unknown>) {
  return {
    provider: String(contentJson.provider ?? "ollama_local"),
    model: contentJson.model ? String(contentJson.model) : null,
    flags: Array.isArray(contentJson.flags) ? (contentJson.flags as string[]) : [],
    confianza: typeof contentJson.confianza === "number" ? contentJson.confianza : null,
    requiereRevision: Boolean(contentJson.requiere_revision_nutriologa),
    motivoRevision: contentJson.motivo_revision ? String(contentJson.motivo_revision) : null,
    preguntaOriginal: contentJson.preguntaOriginal ? String(contentJson.preguntaOriginal) : null,
    saveKind: contentJson.saveKind ? String(contentJson.saveKind) : null,
  };
}
