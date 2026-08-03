import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requirePatientContext } from "@/lib/auth/patient-session";
import { PACIENTE_NAV } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function PacienteHistorialPage() {
  const { patient } = await requirePatientContext();
  const supabase = await createClient();

  const { data: menus } = await supabase
    .from("generated_menus")
    .select("title, status, generation_type, created_at")
    .eq("patient_id", patient.id)
    .order("created_at", { ascending: false })
    .limit(30);

  return (
    <AppShell title="Historial" nav={PACIENTE_NAV} currentPath="/paciente/historial">
      <Card>
        <CardHeader><CardTitle className="text-base">Actividad reciente</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {(menus ?? []).map((m, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <div>
                <p className="font-medium">{m.title}</p>
                <p className="text-xs text-slate-500">{new Date(m.created_at).toLocaleString("es-MX")}</p>
              </div>
              <Badge variant="outline">{m.status}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
      <Link href="/paciente" className="text-sm text-emerald-700 underline">← Inicio</Link>
    </AppShell>
  );
}
