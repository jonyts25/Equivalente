import { assertContextualAiAccess } from "@/lib/ai/contextual-ai-access";
import { runEquivalenteContextualPilot } from "@/lib/ai/ollama-equivalente-contextual";
import type { EquivalenteIntention } from "@/lib/ai/nutrition-safety";
import { jsonUtf8 } from "@/lib/api/json-response";

export async function POST(request: Request) {
  let body: {
    patientId?: string;
    dietPlanId?: string;
    mealSlotId?: string;
    texto?: string;
    hintIntencion?: EquivalenteIntention;
    model?: string;
    debug?: boolean;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonUtf8(
      { ok: false, error: "INVALID_REQUEST", message: "Body JSON inválido." },
      { status: 400 }
    );
  }

  const patientId = body.patientId?.trim();
  const texto = body.texto?.trim();

  if (!patientId || !texto) {
    return jsonUtf8(
      {
        ok: false,
        error: "INVALID_REQUEST",
        message: 'Campos "patientId" y "texto" requeridos.',
      },
      { status: 400 }
    );
  }

  const access = await assertContextualAiAccess(patientId);
  if (!access.ok) {
    return jsonUtf8(
      { ok: false, provider: "ollama_local", error: access.error },
      { status: access.status }
    );
  }

  const result = await runEquivalenteContextualPilot({
    patientId,
    texto,
    dietPlanId: body.dietPlanId,
    mealSlotId: body.mealSlotId,
    model: body.model,
    hintIntencion: body.hintIntencion,
  });

  if (!result.ok) {
    const status =
      result.error === "OLLAMA_ERROR"
        ? 503
        : result.error === "PATIENT_NOT_FOUND"
          ? 404
          : 422;
    return jsonUtf8(
      {
        ok: false,
        provider: "ollama_local",
        error: result.error,
        message: "message" in result ? result.message : undefined,
        rawPreview: "rawPreview" in result ? result.rawPreview : undefined,
      },
      { status }
    );
  }

  const { ok: _resultOk, model, rawContent, contextCompleteness, contexto, ...payload } = result;
  void _resultOk;

  const isAdmin = access.role === "admin";

  return jsonUtf8({
    ok: true,
    provider: "ollama_local",
    model,
    contextCompleteness,
    contexto,
    ...payload,
    ...(body.debug && isAdmin ? { debug: { rawContent } } : {}),
  });
}
