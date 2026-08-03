import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { DisclaimerBanner } from "@/components/layout/DisclaimerBanner";
import { MenuCard } from "@/components/menus/MenuCard";
import { MenuActions } from "@/components/menus/MenuActions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePatientContext } from "@/lib/auth/patient-session";
import { PACIENTE_NAV } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function PacienteHoyPage() {
  const { patient } = await requirePatientContext();
  const supabase = await createClient();

  const { data: diet } = await supabase
    .from("diet_plans")
    .select("*, meal_slots(*)")
    .eq("patient_id", patient.id)
    .eq("status", "active")
    .maybeSingle();

  const nextSlot = diet?.meal_slots?.sort(
    (a: { slot_order: number }, b: { slot_order: number }) => a.slot_order - b.slot_order
  )?.[0];

  const { data: recommended } = await supabase
    .from("generated_menus")
    .select("*")
    .eq("patient_id", patient.id)
    .in("status", ["approved", "pending_review"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <AppShell title="Hoy" nav={PACIENTE_NAV} currentPath="/paciente/hoy">
      <DisclaimerBanner />
      <Card>
        <CardHeader><CardTitle className="text-base">Próxima comida</CardTitle></CardHeader>
        <CardContent>
          <p className="text-lg font-medium">{nextSlot?.name ?? "Sin horario configurado"}</p>
          {nextSlot?.notes && <p className="text-sm text-slate-500">{nextSlot.notes}</p>}
        </CardContent>
      </Card>

      {recommended ? (
        <MenuCard title={recommended.title} status={recommended.status} explanation={recommended.explanation}>
          <pre className="max-h-40 overflow-auto text-xs">{JSON.stringify(recommended.content_json, null, 2)}</pre>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild size="sm" variant="secondary"><Link href="/paciente/opciones">Cambiar opción</Link></Button>
            <Button asChild size="sm" variant="outline"><Link href="/paciente/opciones">Ver equivalencias</Link></Button>
            <MenuActions menuId={recommended.id} role="patient" />
          </div>
        </MenuCard>
      ) : (
        <Card>
          <CardContent className="py-6 text-center text-sm text-slate-500">
            Sin opción recomendada aún.{" "}
            <Link href="/paciente/opciones/manual" className="text-emerald-700 underline">Pedir opciones</Link>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Link href="/paciente/antojo" className="rounded-lg border bg-white p-3 text-center text-sm">Tengo antojo</Link>
        <Link href="/paciente/ingredientes" className="rounded-lg border bg-white p-3 text-center text-sm">Tengo ingredientes</Link>
        <Link href="/paciente/opciones" className="rounded-lg border bg-white p-3 text-center text-sm">Más opciones</Link>
        <Link href="/paciente/super" className="rounded-lg border bg-white p-3 text-center text-sm">Lista súper</Link>
      </div>
    </AppShell>
  );
}
