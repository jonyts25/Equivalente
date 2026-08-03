import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getPatientProgress } from "@/app/actions/progress";
import { AppShell } from "@/components/layout/AppShell";
import { ProgressAnalysisPanel } from "@/components/progress/ProgressAnalysisPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildProgressAnalysisContext } from "@/lib/ai/progress-analysis";
import { activeCheckins } from "@/lib/progress/summary";
import { getCurrentProfile } from "@/lib/auth/session";
import { NUTRIOLOGO_NAV } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function SeguimientoAnalisisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  if (!profile || !["admin", "nutritionist"].includes(profile.role)) redirect("/login");

  const supabase = await createClient();
  const { data: patient } = await supabase.from("patients").select("full_name").eq("id", id).single();
  if (!patient) notFound();

  const progress = await getPatientProgress(id).catch(() => null);
  if (!progress) notFound();

  const active = activeCheckins(progress.checkins);
  const dates = active.map((c) => c.checkin_date).sort();

  const ctx = buildProgressAnalysisContext({
    baseline: progress.baseline,
    checkins: progress.checkins,
    composition: progress.composition,
  });

  return (
    <AppShell title="Análisis de progreso" nav={NUTRIOLOGO_NAV} currentPath="/nutriologo/pacientes">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{patient.full_name}</CardTitle>
        </CardHeader>
        <CardContent>
          <ProgressAnalysisPanel
            patientId={id}
            checkinCount={active.length}
            compositionCount={progress.composition.filter((c) => !c.is_deleted).length}
            missingNotes={ctx.missingDataNotes}
            existingAnalyses={progress.analyses}
            minCheckinDate={dates[0] ?? null}
            maxCheckinDate={dates[dates.length - 1] ?? null}
          />
        </CardContent>
      </Card>
      <Link href={`/nutriologo/pacientes/${id}/seguimiento`} className="text-sm text-emerald-700 underline">
        ← Seguimiento
      </Link>
    </AppShell>
  );
}
