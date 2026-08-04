/**
 * Dev-only Ollama pilot APIs (direct, not queue).
 * Never allow in production — even if ENABLE_OLLAMA_DEV_API is set by mistake.
 */
export function isOllamaDevApiEnabled(): boolean {
  return (
    process.env.ENABLE_OLLAMA_DEV_API === "true" &&
    process.env.NODE_ENV !== "production"
  );
}

export async function assertDevAiApiAccess(): Promise<
  { ok: true } | { ok: false; status: number; error: string }
> {
  if (isOllamaDevApiEnabled()) {
    return { ok: true };
  }

  return {
    ok: false,
    status: 403,
    error:
      "Acceso denegado. El panel piloto de Ollama solo está disponible en desarrollo local con ENABLE_OLLAMA_DEV_API=true.",
  };
}

/** @deprecated Use isOllamaDevApiEnabled() */
export function isOllamaDevApiPublic(): boolean {
  return isOllamaDevApiEnabled();
}
