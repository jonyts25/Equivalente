import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { jsonUtf8 } from "@/lib/api/json-response";

/**
 * Polling endpoint for queued AI jobs (ollama_queue).
 * GET /api/ai/jobs/[jobId]/status
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ jobId: string }> }
) {
  const profile = await getCurrentProfile();
  if (!profile) {
    return jsonUtf8({ ok: false, error: "UNAUTHORIZED", message: "No autenticado." }, { status: 401 });
  }

  const { jobId } = await context.params;
  if (!jobId?.trim()) {
    return jsonUtf8(
      { ok: false, error: "INVALID_REQUEST", message: "jobId requerido." },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { data: job, error } = await supabase
    .from("ai_jobs")
    .select(
      "id, app, tipo, status, resultado, error, payload, created_by, created_at, updated_at, processed_at"
    )
    .eq("id", jobId)
    .maybeSingle();

  if (error) {
    return jsonUtf8(
      { ok: false, error: "DB_ERROR", message: error.message },
      { status: 500 }
    );
  }

  if (!job) {
    return jsonUtf8({ ok: false, error: "NOT_FOUND", message: "Job no encontrado." }, { status: 404 });
  }

  const payload = (job.payload ?? {}) as Record<string, unknown>;
  const payloadUserId = typeof payload.userId === "string" ? payload.userId : null;
  const isOwner =
    job.created_by === profile.id || payloadUserId === profile.id;
  const isStaff = profile.role === "admin" || profile.role === "nutritionist";

  if (!isOwner && !isStaff) {
    return jsonUtf8({ ok: false, error: "FORBIDDEN", message: "Sin acceso a este job." }, { status: 403 });
  }

  return jsonUtf8({
    ok: true,
    jobId: job.id,
    app: job.app,
    tipo: job.tipo,
    status: job.status,
    result: job.resultado ?? null,
    error: job.error ?? null,
    created_at: job.created_at,
    updated_at: job.updated_at ?? null,
    processed_at: job.processed_at ?? null,
  });
}
