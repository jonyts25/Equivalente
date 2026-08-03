export function authDebugLog(label: string, payload: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "development") return;
  console.log(`[auth-debug] ${label}`, payload);
}

export function supabaseDebugLog() {
  if (process.env.NODE_ENV !== "development") return;
  console.log("[supabase-debug]", process.env.NEXT_PUBLIC_SUPABASE_URL ?? "(missing)");
}
