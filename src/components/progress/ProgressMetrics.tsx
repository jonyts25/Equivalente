import type { ProgressConfidence } from "@/lib/progress/types";
import { deltaTone, formatDelta } from "@/lib/progress/summary";

export function DeltaCell({
  value,
  unit,
  invertColors = false,
}: {
  value: number | null;
  unit: string;
  /** true for metrics where down is good (weight, waist, fat) */
  invertColors?: boolean;
}) {
  const tone = deltaTone(value);
  const good =
    tone === "neutral"
      ? "text-slate-500"
      : tone === "down"
        ? invertColors
          ? "text-emerald-700"
          : "text-red-600"
        : invertColors
          ? "text-red-600"
          : "text-emerald-700";

  return <span className={`tabular-nums ${tone === "neutral" ? "text-slate-400" : good}`}>{formatDelta(value, unit)}</span>;
}

export function SourceBadge({ source, confidence }: { source: string; confidence: ProgressConfidence | null }) {
  return (
    <span className="inline-flex flex-col gap-0.5 text-[10px] text-slate-500">
      <span>{source}</span>
      {confidence && <span className="text-slate-400">{confidence}</span>}
    </span>
  );
}

export function VisibilityBadge({ visible }: { visible: boolean }) {
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
        visible ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"
      }`}
    >
      {visible ? "Visible" : "Oculto"}
    </span>
  );
}
