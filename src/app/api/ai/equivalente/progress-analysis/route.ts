import { assertDevAiApiAccess } from "@/lib/ai/dev-api-access";
import { assertProgressAnalysisAccess } from "@/lib/progress/access";
import { getPatientProgress, createProgressAiAnalysis } from "@/app/actions/progress";
import { runProgressAnalysisPilot } from "@/lib/ai/progress-analysis";
import { jsonUtf8 } from "@/lib/api/json-response";

export async function POST(request: Request) {
  const devAccess = await assertDevAiApiAccess();
  if (!devAccess.ok) {
    return jsonUtf8(
      { ok: false, provider: "ollama_local", error: devAccess.error },
      { status: devAccess.status }
    );
  }

  let body: {
    patientId?: string;
    rangeStart?: string;
    rangeEnd?: string;
    model?: string;
    save?: boolean;
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
  if (!patientId) {
    return jsonUtf8(
      { ok: false, error: "INVALID_REQUEST", message: 'Campo "patientId" requerido.' },
      { status: 400 }
    );
  }

  const access = await assertProgressAnalysisAccess(patientId);
  if (!access.ok) {
    return jsonUtf8({ ok: false, error: access.error }, { status: access.status });
  }

  let progress;
  try {
    progress = await getPatientProgress(patientId);
  } catch (e) {
    return jsonUtf8(
      {
        ok: false,
        error: "ACCESS_DENIED",
        message: e instanceof Error ? e.message : "Sin acceso",
      },
      { status: 403 }
    );
  }

  if (!progress) {
    return jsonUtf8({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }

  const filteredCheckins = progress.checkins.filter((c) => {
    if (c.is_deleted) return false;
    if (body.rangeStart && c.checkin_date < body.rangeStart) return false;
    if (body.rangeEnd && c.checkin_date > body.rangeEnd) return false;
    return true;
  });
  const filteredComp = progress.composition.filter((c) => {
    if (c.is_deleted) return false;
    if (body.rangeStart && c.measured_at < body.rangeStart) return false;
    if (body.rangeEnd && c.measured_at > body.rangeEnd) return false;
    return true;
  });

  const result = await runProgressAnalysisPilot({
    context: {
      baseline: progress.baseline,
      checkins: filteredCheckins,
      composition: filteredComp,
      rangeStart: body.rangeStart,
      rangeEnd: body.rangeEnd,
    },
    model: body.model,
  });

  if (!result.ok) {
    return jsonUtf8(
      {
        ok: false,
        provider: "ollama_local",
        error: result.error,
        message: "message" in result ? result.message : undefined,
      },
      { status: 503 }
    );
  }

  let savedId: string | undefined;
  if (body.save !== false) {
    const saved = await createProgressAiAnalysis({
      patientId,
      summary: result.payload.summary,
      trendJson: { ...result.payload.trend } as Record<string, unknown>,
      flags: result.payload.flags,
      model: result.model,
      rangeStart: body.rangeStart ?? null,
      rangeEnd: body.rangeEnd ?? null,
      rawPayload: result.payload as unknown as Record<string, unknown>,
    });
    savedId = saved.id;
  }

  return jsonUtf8({
    ok: true,
    provider: "ollama_local",
    model: result.model,
    ...result.payload,
    contextPreview: result.contextPreview,
    savedAnalysisId: savedId,
    requires_nutritionist_review: true,
    visible_to_patient: false,
  });
}
