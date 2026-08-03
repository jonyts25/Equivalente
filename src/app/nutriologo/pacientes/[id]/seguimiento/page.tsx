import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getPatientProgress } from "@/app/actions/progress";
import { AppShell } from "@/components/layout/AppShell";
import { ProgressDashboardCards } from "@/components/progress/ProgressDashboardCards";
import { ProgressCheckinsTable, ProgressCompositionTable } from "@/components/progress/ProgressTables";
import { SimpleLineChart } from "@/components/progress/SimpleLineChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  chartSeriesFromCheckins,
  chartSeriesFromComposition,
  enrichCheckinsWithDeltas,
  enrichCompositionWithDeltas,
} from "@/lib/progress/summary";
import { getCurrentProfile } from "@/lib/auth/session";
import { NUTRIOLOGO_NAV } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function SeguimientoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  if (!profile || !["admin", "nutritionist"].includes(profile.role)) redirect("/login");

  const supabase = await createClient();
  const { data: patient } = await supabase.from("patients").select("full_name").eq("id", id).single();
  if (!patient) notFound();

  const progress = await getPatientProgress(id).catch(() => null);
  if (!progress) notFound();

  const { baseline, checkins, composition, summary } = progress;
  const checkinRows = enrichCheckinsWithDeltas(checkins);
  const compositionRows = enrichCompositionWithDeltas(composition);

  const weightSeries = chartSeriesFromCheckins(checkins, "weight_kg");
  const waistSeries = chartSeriesFromCheckins(checkins, "waist_cm");
  const abdomenSeries = chartSeriesFromCheckins(checkins, "abdomen_cm");
  const fatSeries = chartSeriesFromComposition(composition, "body_fat_percent");
  const muscleSeries = chartSeriesFromComposition(composition, "muscle_mass_kg");

  return (
    <AppShell title={`Seguimiento — ${patient.full_name}`} nav={NUTRIOLOGO_NAV} currentPath="/nutriologo/pacientes">
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/nutriologo/pacientes/${id}/seguimiento/nuevo`}
          className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white"
        >
          + Captura rápida
        </Link>
        <Link
          href={`/nutriologo/pacientes/${id}/seguimiento/importar`}
          className="rounded-lg border px-3 py-2 text-sm"
        >
          Importar Excel
        </Link>
        <Link
          href={`/nutriologo/pacientes/${id}/seguimiento/analisis`}
          className="rounded-lg border px-3 py-2 text-sm"
        >
          Análisis IA
        </Link>
      </div>

      <ProgressDashboardCards summary={summary} />

      <Card>
        <CardHeader><CardTitle className="text-base">Datos base</CardTitle></CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <p>Talla: {baseline?.height_cm ?? "sin dato"} cm</p>
          <p>Peso inicial (perfil): {baseline?.initial_weight_kg ?? "sin dato"} kg</p>
          <p>Peso ideal: {baseline?.ideal_weight_kg ?? "sin dato"} kg</p>
          <p>Distribución: {baseline?.body_distribution ?? "unknown"}</p>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        <SimpleLineChart title="Peso" data={weightSeries} unit="kg" />
        <SimpleLineChart title="Cintura" data={waistSeries} unit="cm" color="#2563eb" />
        <SimpleLineChart title="Abdomen" data={abdomenSeries} unit="cm" color="#0891b2" />
        <SimpleLineChart title="% grasa" data={fatSeries} unit="%" color="#d97706" />
        <SimpleLineChart title="Masa muscular" data={muscleSeries} unit="kg" color="#7c3aed" />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Check-ins antropométricos</CardTitle></CardHeader>
        <CardContent>
          <ProgressCheckinsTable patientId={id} rows={checkinRows} />
          {checkinRows.length === 0 && (
            <p className="p-4 text-sm text-slate-500">Sin check-ins. Usa captura rápida o importa Excel.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Composición corporal</CardTitle></CardHeader>
        <CardContent>
          <ProgressCompositionTable patientId={id} rows={compositionRows} />
          {compositionRows.length === 0 && (
            <p className="p-4 text-sm text-slate-500">Sin registros de composición.</p>
          )}
        </CardContent>
      </Card>

      <Link href={`/nutriologo/pacientes/${id}`} className="text-sm text-emerald-700 underline">
        ← Perfil
      </Link>
    </AppShell>
  );
}
