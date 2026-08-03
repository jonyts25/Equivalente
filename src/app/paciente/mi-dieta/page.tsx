import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePatientContext } from "@/lib/auth/patient-session";
import { PACIENTE_NAV } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function PacienteMiDietaPage() {
  const { patient } = await requirePatientContext();
  const supabase = await createClient();

  const { data: diet } = await supabase
    .from("diet_plans")
    .select("*, meal_slots(*, meal_requirements(*))")
    .eq("patient_id", patient.id)
    .eq("status", "active")
    .maybeSingle();

  return (
    <AppShell title="Mi dieta" nav={PACIENTE_NAV} currentPath="/paciente/mi-dieta">
      {diet ? (
        <>
          <Card>
            <CardHeader><CardTitle className="text-base">{diet.title}</CardTitle></CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap text-sm">{diet.raw_text}</pre>
            </CardContent>
          </Card>
          {(diet.meal_slots as Array<{ name: string; slot_order: number; notes?: string }>)?.map((slot) => (
            <Card key={slot.name}>
              <CardHeader><CardTitle className="text-base">{slot.name}</CardTitle></CardHeader>
              <CardContent className="text-sm text-slate-600">{slot.notes ?? "Según equivalencias del plan."}</CardContent>
            </Card>
          ))}
        </>
      ) : (
        <Card><CardContent className="py-6 text-sm text-slate-500">Tu nutrióloga aún no ha cargado tu dieta activa.</CardContent></Card>
      )}
      <Link href="/paciente" className="text-sm text-emerald-700 underline">← Inicio</Link>
    </AppShell>
  );
}
