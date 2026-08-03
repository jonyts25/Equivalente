import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { DisclaimerBanner } from "@/components/layout/DisclaimerBanner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentProfile } from "@/lib/auth/session";
import { ADMIN_NAV } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AdminDashboard() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") redirect("/login");

  const supabase = await createClient();
  const [{ count: nutritionists }, { count: patients }, { count: logs }] = await Promise.all([
    supabase.from("nutritionists").select("*", { count: "exact", head: true }),
    supabase.from("patients").select("*", { count: "exact", head: true }),
    supabase.from("ai_generation_logs").select("*", { count: "exact", head: true }),
  ]);

  return (
    <AppShell title="Admin" subtitle={profile.full_name ?? "Administrador"} nav={ADMIN_NAV} currentPath="/admin">
      <DisclaimerBanner />
      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardHeader><CardTitle className="text-base">Nutriólogos</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{nutritionists ?? 0}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Pacientes</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{patients ?? 0}</p></CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Logs IA</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{logs ?? 0}</p></CardContent></Card>
      </div>
      <Card className="mt-4">
        <CardHeader><CardTitle className="text-base">Herramientas</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-3 text-sm">
          <Link href="/admin/ia-local" className="rounded-lg border bg-white px-4 py-3 hover:bg-slate-50">
            IA local (Ollama)
          </Link>
          <Link href="/admin/configuracion" className="rounded-lg border bg-white px-4 py-3 hover:bg-slate-50">
            Configuración
          </Link>
          <Link href="/admin/logs-ia" className="rounded-lg border bg-white px-4 py-3 hover:bg-slate-50">
            Logs IA
          </Link>
        </CardContent>
      </Card>
    </AppShell>
  );
}
