import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ForbiddenTreatForm } from "@/components/nutritionist/ForbiddenTreatForm";
import { getCurrentProfile } from "@/lib/auth/session";
import { NUTRIOLOGO_NAV } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function PacienteGustosProhibidosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  if (!profile || !["admin", "nutritionist"].includes(profile.role)) redirect("/login");

  const supabase = await createClient();
  if (!(await supabase.from("patients").select("id").eq("id", id).single()).data) notFound();

  const { data: treats } = await supabase.from("forbidden_treats").select("*").eq("patient_id", id);

  return (
    <AppShell title="Gustos prohibidos" nav={NUTRIOLOGO_NAV} currentPath="/nutriologo/pacientes">
      <Card>
        <CardHeader><CardTitle className="text-base">Gustos prohibidos</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {(treats ?? []).map((t) => (
            <div key={t.id} className="flex justify-between rounded border p-2 text-sm">
              <span>{t.name}</span>
              <Badge variant="warning">{t.mode}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Agregar gusto prohibido</CardTitle></CardHeader>
        <CardContent><ForbiddenTreatForm patientId={id} /></CardContent>
      </Card>
      <Link href={`/nutriologo/pacientes/${id}`} className="text-sm text-emerald-700 underline">← Perfil</Link>
    </AppShell>
  );
}
