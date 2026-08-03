import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { requirePatientContext } from "@/lib/auth/patient-session";
import { PACIENTE_NAV } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function PacientePreferenciasPage() {
  const { patient } = await requirePatientContext();
  const supabase = await createClient();

  const { data: prefs } = await supabase
    .from("patient_food_preferences")
    .select("*")
    .eq("patient_id", patient.id);

  return (
    <AppShell title="Preferencias" nav={PACIENTE_NAV} currentPath="/paciente/preferencias">
      <Card>
        <CardHeader><CardTitle className="text-base">Mis preferencias</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {(prefs ?? []).map((p) => (
            <div key={p.id} className="flex justify-between text-sm">
              <span>{p.custom_food_name ?? p.food_item_id}</span>
              <Badge variant="outline">{p.preference}</Badge>
            </div>
          ))}
          {!prefs?.length && <p className="text-sm text-slate-500">Registra con tu nutrióloga lo que te gusta o no.</p>}
        </CardContent>
      </Card>
      <Link href="/paciente/gustos-prohibidos" className="text-sm text-emerald-700 underline">Ver gustos prohibidos →</Link>
    </AppShell>
  );
}
