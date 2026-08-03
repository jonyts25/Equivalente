import {
  getOllamaBaseUrl,
  getOllamaModelFast,
  getOllamaModelSpanish,
  getOllamaTimeoutMs,
} from "./config";

export type OllamaMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type OllamaChatErrorCode = "TIMEOUT" | "UNAVAILABLE" | "HTTP_ERROR" | "EMPTY_RESPONSE";

export type OllamaChatResult =
  | { ok: true; content: string; model: string }
  | { ok: false; error: string; code?: OllamaChatErrorCode };

export type OllamaJsonResult<T = unknown> =
  | { ok: true; data: T; content: string; model: string }
  | {
      ok: false;
      error: "INVALID_JSON" | "OLLAMA_ERROR";
      message?: string;
      rawPreview?: string;
      code?: string;
    };

export type OllamaHealthResult =
  | { ok: true; models: Array<{ name: string; size?: number }> }
  | { ok: false; error: string };

function connectionErrorMessage(): string {
  return `No se pudo conectar con Ollama en ${getOllamaBaseUrl()}. Verifica que esté corriendo (ollama serve).`;
}

async function fetchOllama(
  path: string,
  init: RequestInit
): Promise<{ response?: Response; error?: string; code?: OllamaChatErrorCode }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), getOllamaTimeoutMs());

  try {
    const response = await fetch(`${getOllamaBaseUrl()}${path}`, {
      ...init,
      signal: controller.signal,
    });
    return { response };
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      return {
        error: `Ollama no respondió en ${getOllamaTimeoutMs()} ms.`,
        code: "TIMEOUT",
      };
    }
    return { error: connectionErrorMessage(), code: "UNAVAILABLE" };
  } finally {
    clearTimeout(timeout);
  }
}

function parseJsonContent(content: string): unknown {
  const trimmed = content.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonText = fenceMatch ? fenceMatch[1].trim() : trimmed;
  return JSON.parse(jsonText);
}

export async function ollamaHealth(): Promise<OllamaHealthResult> {
  const { response, error, code } = await fetchOllama("/api/tags", { method: "GET" });

  if (error || !response) {
    return { ok: false, error: error ?? connectionErrorMessage() };
  }

  if (!response.ok) {
    return {
      ok: false,
      error: `Ollama respondió con HTTP ${response.status}${code ? ` (${code})` : ""}.`,
    };
  }

  try {
    const body = (await response.json()) as {
      models?: Array<{ name: string; size?: number }>;
    };
    return {
      ok: true,
      models: (body.models ?? []).map((m) => ({ name: m.name, size: m.size })),
    };
  } catch {
    return { ok: false, error: "Respuesta inválida de Ollama /api/tags." };
  }
}

export async function ollamaChat(input: {
  model: string;
  messages: OllamaMessage[];
  temperature?: number;
}): Promise<OllamaChatResult> {
  const { response, error, code } = await fetchOllama("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: input.model,
      stream: false,
      messages: input.messages,
      options: input.temperature !== undefined ? { temperature: input.temperature } : undefined,
    }),
  });

  if (error || !response) {
    return { ok: false, error: error ?? connectionErrorMessage(), code };
  }

  if (!response.ok) {
    let detail = "";
    try {
      detail = await response.text();
    } catch {
      // ignore
    }
    return {
      ok: false,
      error: `Ollama respondió con HTTP ${response.status}${detail ? `: ${detail.slice(0, 200)}` : ""}.`,
      code: "HTTP_ERROR",
    };
  }

  try {
    const body = (await response.json()) as { message?: { content?: string } };
    const content = body.message?.content?.trim();
    if (!content) {
      return { ok: false, error: "Ollama no devolvió contenido.", code: "EMPTY_RESPONSE" };
    }
    return { ok: true, content, model: input.model };
  } catch {
    return { ok: false, error: "No se pudo leer la respuesta de Ollama.", code: "HTTP_ERROR" };
  }
}

export async function ollamaJson<T = unknown>(input: {
  model: string;
  system: string;
  prompt: string;
  temperature?: number;
}): Promise<OllamaJsonResult<T>> {
  const chat = await ollamaChat({
    model: input.model,
    temperature: input.temperature ?? 0.2,
    messages: [
      { role: "system", content: input.system },
      { role: "user", content: input.prompt },
    ],
  });

  if (!chat.ok) {
    return {
      ok: false,
      error: "OLLAMA_ERROR",
      message: chat.error ?? "Error desconocido de Ollama",
      code: chat.code,
    };
  }

  try {
    const data = parseJsonContent(chat.content) as T;
    return { ok: true, data, content: chat.content, model: chat.model };
  } catch {
    return {
      ok: false,
      error: "INVALID_JSON",
      rawPreview: chat.content.slice(0, 500),
    };
  }
}

/** Modelo rápido para pruebas piloto (llama3.2:3b por defecto). */
export function getPilotChatModel(): string {
  return getOllamaModelFast();
}

/** Modelo preferido para respuestas en español (gemma3:4b por defecto). */
export function getPilotSpanishModel(): string {
  return getOllamaModelSpanish();
}
