import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DietEditor } from "@/components/nutritionist/DietEditor";
import { getCurrentProfile } from "@/lib/auth/session";
import { NUTRIOLOGO_NAV } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function PacienteDietaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  if (!profile || !["admin", "nutritionist"].includes(profile.role)) redirect("/login");

  const supabase = await createClient();
  const { data: patient } = await supabase.from("patients").select("full_name").eq("id", id).single();
  if (!patient) notFound();

  const { data: diet } = await supabase
    .from("diet_plans")
    .select("*, meal_slots(*, meal_requirements(*))")
    .eq("patient_id", id)
    .eq("status", "active")
    .maybeSingle();

  return (
    <AppShell title={`Dieta — ${patient.full_name}`} nav={NUTRIOLOGO_NAV} currentPath="/nutriologo/pacientes">
      {diet && (
        <Card>
          <CardHeader><CardTitle className="text-base">Dieta activa: {diet.title}</CardTitle></CardHeader>
          <CardContent>
            <pre className="max-h-40 overflow-auto whitespace-pre-wrap text-xs">{diet.raw_text}</pre>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader><CardTitle className="text-base">Cargar / estructurar dieta</CardTitle></CardHeader>
        <CardContent>
          <DietEditor patientId={id} initialRawText={diet?.raw_text ?? ""} />
        </CardContent>
      </Card>
      <Link href={`/nutriologo/pacientes/${id}`} className="text-sm text-emerald-700 underline">← Perfil</Link>
    </AppShell>
  );
}
