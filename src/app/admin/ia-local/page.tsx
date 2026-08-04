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
import { ADMIN_NAV } from "@/lib/navigation";

export default async function AdminIaLocalPage() {
  if (!isOllamaDevApiEnabled()) notFound();

  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") redirect("/login");

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
    <AppShell title="IA local (Ollama)" nav={ADMIN_NAV} currentPath="/admin/ia-local">
      <OllamaLocalPanel env={env} initialHealth={initialHealth} patients={patients} />
      <div className="mt-4 flex gap-4 text-sm">
        <Link href="/admin/configuracion" className="text-emerald-700 underline">
          ← Configuración
        </Link>
        <Link href="/admin" className="text-emerald-700 underline">
          Dashboard admin
        </Link>
      </div>
    </AppShell>
  );
}
