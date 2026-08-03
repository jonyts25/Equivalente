import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCurrentProfile } from "@/lib/auth/session";
import { ADMIN_NAV } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLogsIaPage() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") redirect("/login");

  const supabase = await createClient();
  const { data: logs } = await supabase
    .from("ai_generation_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <AppShell title="Logs IA" nav={ADMIN_NAV} currentPath="/admin/logs-ia">
      <Card>
        <CardHeader><CardTitle className="text-base">Registro de generaciones</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {(logs ?? []).map((log) => (
            <div key={log.id} className="rounded border p-2 text-xs">
              <div className="flex justify-between">
                <span className="font-medium">{log.task_type}</span>
                <Badge variant="outline">{log.provider}</Badge>
              </div>
              <p className="text-slate-500">{new Date(log.created_at).toLocaleString("es-MX")} — {log.status}</p>
            </div>
          ))}
        </CardContent>
      </Card>
      <Link href="/admin" className="text-sm text-emerald-700 underline">← Dashboard</Link>
    </AppShell>
  );
}
