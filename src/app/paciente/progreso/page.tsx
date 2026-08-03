import { redirect } from "next/navigation";
import { getPatientProgress } from "@/app/actions/progress";
import { AppShell } from "@/components/layout/AppShell";
import { SimpleLineChart } from "@/components/progress/SimpleLineChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePatientContext } from "@/lib/auth/patient-session";
import {
  chartSeriesFromCheckins,
  chartSeriesFromComposition,
  formatDelta,
  formatMetric,
} from "@/lib/progress/summary";
import { PACIENTE_NAV } from "@/lib/navigation";

export default async function PacienteProgresoPage() {
  const { patient } = await requirePatientContext();

  const progress = await getPatientProgress(patient.id).catch(() => null);
  if (!progress) redirect("/paciente");

  const hasData =
    progress.checkins.length > 0 ||
    progress.composition.length > 0 ||
    progress.analyses.some((a) => a.visible_to_patient);

  if (!hasData) {
    return (
      <AppShell title="Mi progreso" nav={PACIENTE_NAV} currentPath="/paciente/progreso">
        <Card>
          <CardContent className="pt-6 text-sm text-slate-600">
            Tu nutrióloga aún no ha publicado tu seguimiento.
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  const weightSeries = chartSeriesFromCheckins(progress.checkins, "weight_kg");
  const waistSeries = chartSeriesFromCheckins(progress.checkins, "waist_cm");
  const abdomenSeries = chartSeriesFromCheckins(progress.checkins, "abdomen_cm");
  const fatSeries = chartSeriesFromComposition(progress.composition, "body_fat_percent");
  const visibleAnalyses = progress.analyses.filter((a) => a.visible_to_patient);
  const { summary } = progress;

  return (
    <AppShell title="Mi progreso" nav={PACIENTE_NAV} currentPath="/paciente/progreso">
      <div className="grid gap-2 grid-cols-2 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-xs">Peso actual</CardTitle></CardHeader>
          <CardContent className="text-lg font-semibold">{formatMetric(summary.latestWeightKg, "kg")}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-xs">Cambio total</CardTitle></CardHeader>
          <CardContent className="text-lg font-semibold">{formatDelta(summary.weightChangeFromStartKg, "kg")}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1"><CardTitle className="text-xs">Cintura</CardTitle></CardHeader>
          <CardContent className="text-lg font-semibold">{formatMetric(summary.latestWaistCm, "cm")}</CardContent>
        </Card>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <SimpleLineChart title="Peso" data={weightSeries} unit="kg" />
        <SimpleLineChart title="Cintura" data={waistSeries} unit="cm" color="#2563eb" />
        <SimpleLineChart title="Abdomen" data={abdomenSeries} unit="cm" color="#0891b2" />
        {fatSeries.length > 0 && (
          <SimpleLineChart title="% grasa" data={fatSeries} unit="%" color="#d97706" />
        )}
      </div>

      {visibleAnalyses.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Resumen de tu nutrióloga</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {visibleAnalyses.map((a) => (
              <div key={a.id} className="rounded border p-3 text-sm">
                <p className="text-xs text-slate-500 mb-1">
                  {new Date(a.analysis_date).toLocaleDateString("es-MX")}
                </p>
                <p>{a.summary}</p>
                {a.nutritionist_notes && (
                  <p className="mt-2 text-xs text-slate-600">{a.nutritionist_notes}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {progress.composition.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Composición (último registro publicado)</CardTitle></CardHeader>
          <CardContent className="text-sm">
            {(() => {
              const e = progress.composition[0];
              return (
                <>
                  <p>Grasa: {e.body_fat_percent ?? "sin dato"} %</p>
                  <p>Masa muscular: {e.muscle_mass_kg ?? "sin dato"} kg</p>
                </>
              );
            })()}
          </CardContent>
        </Card>
      )}
    </AppShell>
  );
}
