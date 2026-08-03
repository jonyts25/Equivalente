import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProgressSummaryCards } from "@/lib/progress/types";
import { formatDelta, formatMetric } from "@/lib/progress/summary";

function MetricCard({
  title,
  value,
  sub,
}: {
  title: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-xs font-medium text-slate-600">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-lg font-semibold tabular-nums">{value}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export function ProgressDashboardCards({ summary }: { summary: ProgressSummaryCards }) {
  return (
    <div className="grid gap-2 grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Peso inicial"
        value={formatMetric(summary.initialWeightKg, "kg")}
      />
      <MetricCard
        title="Peso actual"
        value={formatMetric(summary.latestWeightKg, "kg")}
        sub={`Δ total: ${formatDelta(summary.weightChangeFromStartKg, "kg")}`}
      />
      <MetricCard
        title="Δ último check-in"
        value={formatDelta(summary.weightChangeFromLastCheckinKg, "kg")}
      />
      <MetricCard
        title="Cintura actual"
        value={formatMetric(summary.latestWaistCm, "cm")}
        sub={`Δ total: ${formatDelta(summary.waistChangeFromStartCm, "cm")}`}
      />
      <MetricCard
        title="Cintura inicial"
        value={formatMetric(summary.initialWaistCm, "cm")}
      />
      <MetricCard
        title="Abdomen actual"
        value={formatMetric(summary.latestAbdomenCm, "cm")}
        sub={`Δ total: ${formatDelta(summary.abdomenChangeFromStartCm, "cm")}`}
      />
      <MetricCard
        title="Abdomen inicial"
        value={formatMetric(summary.initialAbdomenCm, "cm")}
      />
      <MetricCard
        title="% grasa (último)"
        value={summary.latestBodyFatPercent != null ? `${summary.latestBodyFatPercent.toFixed(1)} %` : "sin dato"}
      />
      <MetricCard
        title="Masa muscular (última)"
        value={formatMetric(summary.latestMuscleMassKg, "kg")}
      />
      <MetricCard
        title="Última fecha"
        value={summary.lastTrackingDate ?? "sin dato"}
      />
      <MetricCard
        title="Check-ins"
        value={String(summary.checkinCount)}
      />
      <MetricCard
        title="Composición"
        value={String(summary.compositionCount)}
      />
    </div>
  );
}
