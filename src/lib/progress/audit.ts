import type { SupabaseClient } from "@supabase/supabase-js";

export type AuditAction = "create" | "update" | "delete" | "restore" | "import";

export async function logProgressAudit(
  supabase: SupabaseClient,
  input: {
    patientId: string;
    tableName: string;
    recordId: string;
    action: AuditAction;
    beforeJson?: Record<string, unknown> | null;
    afterJson?: Record<string, unknown> | null;
    changedBy: string;
  }
) {
  await supabase.from("progress_edit_audit_log").insert({
    patient_id: input.patientId,
    table_name: input.tableName,
    record_id: input.recordId,
    action: input.action,
    before_json: input.beforeJson ?? null,
    after_json: input.afterJson ?? null,
    changed_by: input.changedBy,
  });
}
