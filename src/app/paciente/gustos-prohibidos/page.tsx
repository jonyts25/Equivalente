import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requirePatientContext } from "@/lib/auth/patient-session";
import { PACIENTE_NAV } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function PacienteGustosProhibidosPage() {
  const { patient } = await requirePatientContext();
  const supabase = await createClient();

  const { data: treats } = await supabase
    .from("forbidden_treats")
    .select("*")
    .eq("patient_id", patient.id);

  return (
    <AppShell title="Gustos prohibidos" nav={PACIENTE_NAV} currentPath="/paciente/gustos-prohibidos">
      <Card>
        <CardHeader><CardTitle className="text-base">Gustos prohibidos</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {(treats ?? []).map((t) => (
            <div key={t.id} className="rounded border p-2 text-sm">
              <div className="flex justify-between">
                <span className="font-medium">{t.name}</span>
                <Badge variant="warning">{t.mode}</Badge>
              </div>
              {t.reason && <p className="text-xs text-slate-500">{t.reason}</p>}
            </div>
          ))}
        </CardContent>
      </Card>
      <Link href="/paciente/preferencias" className="text-sm text-emerald-700 underline">← Preferencias</Link>
    </AppShell>
  );
}
