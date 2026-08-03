import { assertDevAiApiAccess } from "@/lib/ai/dev-api-access";
import { ollamaHealth } from "@/lib/ai/ollama-client";
import { jsonUtf8 } from "@/lib/api/json-response";

export async function GET() {
  const access = await assertDevAiApiAccess();
  if (!access.ok) {
    return jsonUtf8(
      { ok: false, provider: "ollama_local", error: access.error },
      { status: access.status }
    );
  }

  const health = await ollamaHealth();

  if (!health.ok) {
    return jsonUtf8(
      { ok: false, provider: "ollama_local", error: health.error },
      { status: 503 }
    );
  }

  return jsonUtf8({
    ok: true,
    provider: "ollama_local",
    models: health.models.map((m) => m.name),
  });
}
