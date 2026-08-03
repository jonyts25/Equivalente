import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getActiveProvider } from "@/lib/ai/config";
import { getCurrentProfile } from "@/lib/auth/session";
import { ADMIN_NAV } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AdminConfiguracionPage() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") redirect("/login");

  const supabase = await createClient();
  const { data: settings } = await supabase.from("app_settings").select("*");

  return (
    <AppShell title="Configuración" nav={ADMIN_NAV} currentPath="/admin/configuracion">
      <Card>
        <CardHeader><CardTitle className="text-base">Configuración global</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p><strong>AI_PROVIDER (env):</strong> {getActiveProvider()}</p>
          <p><strong>ENABLE_OPENAI_API:</strong> {process.env.ENABLE_OPENAI_API ?? "false"}</p>
          <p><strong>ENABLE_OLLAMA:</strong> {process.env.ENABLE_OLLAMA ?? "false"}</p>
          <p><strong>ENABLE_OLLAMA_DEV_API:</strong> {process.env.ENABLE_OLLAMA_DEV_API ?? "false"}</p>
          <p>
            <Link href="/admin/ia-local" className="text-emerald-700 underline">
              Probar IA local (Ollama) →
            </Link>
          </p>
          {(settings ?? []).map((s) => (
            <div key={s.id} className="rounded border p-2">
              <p className="font-medium">{s.key}</p>
              <pre className="mt-1 overflow-auto text-xs">{JSON.stringify(s.value, null, 2)}</pre>
            </div>
          ))}
        </CardContent>
      </Card>
      <Link href="/admin" className="text-sm text-emerald-700 underline">← Dashboard</Link>
    </AppShell>
  );
}
