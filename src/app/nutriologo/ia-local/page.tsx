import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { listPatientsForIaPanel } from "@/app/actions/equivalente-ia";
import { AppShell } from "@/components/layout/AppShell";
import { OllamaLocalPanel } from "@/components/admin/OllamaLocalPanel";
import {
  getActiveProvider,
  getOllamaBaseUrl,
  getOllamaEmbedModel,
  getOllamaModelFast,
  getOllamaModelSmart,
  getOllamaModelSpanish,
  getOllamaTimeoutMs,
} from "@/lib/ai/config";
import { isOllamaDevApiEnabled } from "@/lib/ai/dev-api-access";
import { ollamaHealth } from "@/lib/ai/ollama-client";
import { getCurrentProfile } from "@/lib/auth/session";
import { NUTRIOLOGO_NAV } from "@/lib/navigation";

export default async function NutriologoIaLocalPage() {
  if (!isOllamaDevApiEnabled()) notFound();

  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "nutritionist") redirect("/login");

  const healthResult = await ollamaHealth();
  const initialHealth = healthResult.ok
    ? {
        ok: true as const,
        models: healthResult.models.map((m) => m.name),
        checkedAt: new Date().toISOString(),
      }
    : {
        ok: false as const,
        error: healthResult.error,
        checkedAt: new Date().toISOString(),
      };

  const env = {
    aiProvider: getActiveProvider(),
    enableOllama: process.env.ENABLE_OLLAMA ?? "false",
    enableOllamaDevApi: process.env.ENABLE_OLLAMA_DEV_API ?? "false",
    defaultModel: getOllamaModelSpanish(),
    ollamaBaseUrl: getOllamaBaseUrl(),
    timeoutMs: getOllamaTimeoutMs(),
    modelsConfigured: {
      fast: getOllamaModelFast(),
      spanish: getOllamaModelSpanish(),
      smart: getOllamaModelSmart(),
      embed: getOllamaEmbedModel(),
    },
  };

  const patients = await listPatientsForIaPanel();

  return (
    <AppShell title="IA local (Ollama)" nav={NUTRIOLOGO_NAV} currentPath="/nutriologo/ia-local">
      <OllamaLocalPanel env={env} initialHealth={initialHealth} patients={patients} />
      <Link href="/nutriologo" className="mt-4 inline-block text-sm text-emerald-700 underline">
        ← Inicio nutriólogo
      </Link>
    </AppShell>
  );
}
