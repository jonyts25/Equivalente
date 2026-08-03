import { assertDevAiApiAccess } from "@/lib/ai/dev-api-access";
import { runEquivalentePilot } from "@/lib/ai/ollama-equivalente";
import type { EquivalenteIntention, EquivalentePilotContext } from "@/lib/ai/nutrition-safety";
import { jsonUtf8 } from "@/lib/api/json-response";

export async function POST(request: Request) {
  const access = await assertDevAiApiAccess();
  if (!access.ok) {
    return jsonUtf8(
      { ok: false, provider: "ollama_local", error: access.error },
      { status: access.status }
    );
  }

  let body: {
    texto?: string;
    model?: string;
    hintIntencion?: EquivalenteIntention;
    context?: EquivalentePilotContext;
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

  const texto = body.texto?.trim();
  if (!texto) {
    return jsonUtf8(
      { ok: false, error: "INVALID_REQUEST", message: 'Campo "texto" requerido.' },
      { status: 400 }
    );
  }

  const result = await runEquivalentePilot({
    texto,
    model: body.model,
    hintIntencion: body.hintIntencion,
    context: body.context ?? {},
  });

  if (!result.ok) {
    const status = result.error === "OLLAMA_ERROR" ? 503 : 422;
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

  const { ok: _resultOk, model, rawContent, ...payload } = result;
  void _resultOk;

  return jsonUtf8({
    ok: true,
    provider: "ollama_local",
    model,
    ...payload,
    ...(body.debug ? { debug: { rawContent } } : {}),
  });
}
