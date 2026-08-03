import { getCurrentProfile } from "@/lib/auth/session";

export async function assertDevAiApiAccess(): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (process.env.ENABLE_OLLAMA_DEV_API === "true") {
    return { ok: true };
  }

  const profile = await getCurrentProfile();
  if (profile?.role === "admin") {
    return { ok: true };
  }

  return {
    ok: false,
    status: 403,
    error: "Acceso denegado. Activa ENABLE_OLLAMA_DEV_API=true en local o inicia sesión como admin.",
  };
}

export function isOllamaDevApiPublic(): boolean {
  return process.env.ENABLE_OLLAMA_DEV_API === "true";
}
