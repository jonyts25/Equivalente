import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCurrentProfile } from "@/lib/auth/session";
import { NUTRIOLOGO_NAV } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function PacienteHistorialPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  if (!profile || !["admin", "nutritionist"].includes(profile.role)) redirect("/login");

  const supabase = await createClient();
  if (!(await supabase.from("patients").select("id").eq("id", id).single()).data) notFound();

  const [{ data: menus }, { data: sessions }] = await Promise.all([
    supabase.from("generated_menus").select("title, status, created_at").eq("patient_id", id).order("created_at", { ascending: false }).limit(20),
    supabase.from("manual_ai_sessions").select("task_type, validation_status, created_at").eq("patient_id", id).order("created_at", { ascending: false }).limit(20),
  ]);

  return (
    <AppShell title="Historial" nav={NUTRIOLOGO_NAV} currentPath="/nutriologo/pacientes">
      <Card>
        <CardHeader><CardTitle className="text-base">Menús</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {(menus ?? []).map((m, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span>{m.title}</span>
              <Badge variant="outline">{m.status}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Sesiones IA manual</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {(sessions ?? []).map((s, i) => (
            <div key={i} className="flex justify-between text-xs text-slate-600">
              <span>{s.task_type}</span>
              <span>{s.validation_status}</span>
            </div>
          ))}
        </CardContent>
      </Card>
      <Link href={`/nutriologo/pacientes/${id}`} className="text-sm text-emerald-700 underline">← Perfil</Link>
    </AppShell>
  );
}
