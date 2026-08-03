import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { QuickCheckinForm } from "@/components/progress/QuickCheckinForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentProfile } from "@/lib/auth/session";
import { NUTRIOLOGO_NAV } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function SeguimientoNuevoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  if (!profile || !["admin", "nutritionist"].includes(profile.role)) redirect("/login");

  const supabase = await createClient();
  const { data: patient } = await supabase.from("patients").select("full_name").eq("id", id).single();
  if (!patient) notFound();

  return (
    <AppShell title="Captura rápida" nav={NUTRIOLOGO_NAV} currentPath="/nutriologo/pacientes">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{patient.full_name}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-slate-600">
            Solo los campos que tengas a la mano. La composición corporal es opcional.
          </p>
          <QuickCheckinForm patientId={id} />
        </CardContent>
      </Card>
      <Link href={`/nutriologo/pacientes/${id}/seguimiento`} className="text-sm text-emerald-700 underline">
        ← Seguimiento
      </Link>
    </AppShell>
  );
}
