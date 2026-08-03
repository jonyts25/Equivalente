import type {
  BodyCompositionEntry,
  NutritionCheckin,
  PatientBaselineProfile,
  ProgressSummaryCards,
} from "./types";

function num(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(Number(value))) return null;
  return Number(value);
}

export function activeCheckins(checkins: NutritionCheckin[]): NutritionCheckin[] {
  return checkins.filter((c) => !c.is_deleted);
}

export function activeComposition(entries: BodyCompositionEntry[]): BodyCompositionEntry[] {
  return entries.filter((e) => !e.is_deleted);
}

function sortedCheckinsAsc(checkins: NutritionCheckin[]): NutritionCheckin[] {
  return [...checkins].sort(
    (a, b) => new Date(a.checkin_date).getTime() - new Date(b.checkin_date).getTime()
  );
}

function sortedCheckinsDesc(checkins: NutritionCheckin[]): NutritionCheckin[] {
  return [...sortedCheckinsAsc(checkins)].reverse();
}

function sortedCompositionAsc(entries: BodyCompositionEntry[]): BodyCompositionEntry[] {
  return [...entries].sort(
    (a, b) => new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime()
  );
}

function firstWithValue<T>(
  rows: T[],
  getter: (row: T) => number | null | undefined
): T | undefined {
  return rows.find((row) => num(getter(row)) != null);
}

export function computeProgressSummary(
  baseline: PatientBaselineProfile | null,
  checkins: NutritionCheckin[],
  composition: BodyCompositionEntry[]
): ProgressSummaryCards {
  const active = activeCheckins(checkins);
  const activeComp = activeComposition(composition);
  const orderedAsc = sortedCheckinsAsc(active);
  const orderedDesc = sortedCheckinsDesc(active);
  const orderedCompDesc = [...sortedCompositionAsc(activeComp)].reverse();

  const latestCheckin = orderedDesc[0];
  const previousCheckin = orderedDesc[1];

  const firstWeight = firstWithValue(orderedAsc, (c) => c.weight_kg);
  const firstWaist = firstWithValue(orderedAsc, (c) => c.waist_cm);
  const firstAbdomen = firstWithValue(orderedAsc, (c) => c.abdomen_cm);

  const startWeight = num(baseline?.initial_weight_kg) ?? num(firstWeight?.weight_kg);
  const startWaist = num(firstWaist?.waist_cm);
  const startAbdomen = num(firstAbdomen?.abdomen_cm);

  const latestWeight = num(latestCheckin?.weight_kg);
  const latestWaist = num(latestCheckin?.waist_cm);
  const latestAbdomen = num(latestCheckin?.abdomen_cm);

  const prevWeight = num(previousCheckin?.weight_kg);

  const latestComp = orderedCompDesc[0];

  const lastDate =
    latestCheckin?.checkin_date ?? latestComp?.measured_at ?? null;

  return {
    initialWeightKg: startWeight,
    latestWeightKg: latestWeight,
    weightChangeFromStartKg:
      startWeight != null && latestWeight != null ? latestWeight - startWeight : null,
    weightChangeFromLastCheckinKg:
      prevWeight != null && latestWeight != null ? latestWeight - prevWeight : null,
    initialWaistCm: startWaist,
    latestWaistCm: latestWaist,
    waistChangeFromStartCm:
      startWaist != null && latestWaist != null ? latestWaist - startWaist : null,
    initialAbdomenCm: startAbdomen,
    latestAbdomenCm: latestAbdomen,
    abdomenChangeFromStartCm:
      startAbdomen != null && latestAbdomen != null ? latestAbdomen - startAbdomen : null,
    latestBodyFatPercent: num(latestComp?.body_fat_percent),
    latestMuscleMassKg: num(latestComp?.muscle_mass_kg),
    lastTrackingDate: lastDate,
    checkinCount: active.length,
    compositionCount: activeComp.length,
  };
}

export type CheckinWithDeltas = NutritionCheckin & {
  weightDelta: number | null;
  waistDelta: number | null;
  abdomenDelta: number | null;
};

export type CompositionWithDeltas = BodyCompositionEntry & {
  weightDelta: number | null;
  bodyFatDelta: number | null;
  muscleDelta: number | null;
};

export function enrichCheckinsWithDeltas(checkins: NutritionCheckin[]): CheckinWithDeltas[] {
  const desc = sortedCheckinsDesc(activeCheckins(checkins));
  return desc.map((row, index) => {
    const older = desc[index + 1];
    const weight = num(row.weight_kg);
    const olderWeight = num(older?.weight_kg);
    const waist = num(row.waist_cm);
    const olderWaist = num(older?.waist_cm);
    const abdomen = num(row.abdomen_cm);
    const olderAbdomen = num(older?.abdomen_cm);
    return {
      ...row,
      weightDelta: weight != null && olderWeight != null ? weight - olderWeight : null,
      waistDelta: waist != null && olderWaist != null ? waist - olderWaist : null,
      abdomenDelta: abdomen != null && olderAbdomen != null ? abdomen - olderAbdomen : null,
    };
  });
}

export function enrichCompositionWithDeltas(
  entries: BodyCompositionEntry[]
): CompositionWithDeltas[] {
  const desc = [...sortedCompositionAsc(activeComposition(entries))].reverse();
  return desc.map((row, index) => {
    const older = desc[index + 1];
    const weight = num(row.weight_kg);
    const olderWeight = num(older?.weight_kg);
    const fat = num(row.body_fat_percent);
    const olderFat = num(older?.body_fat_percent);
    const muscle = num(row.muscle_mass_kg);
    const olderMuscle = num(older?.muscle_mass_kg);
    return {
      ...row,
      weightDelta: weight != null && olderWeight != null ? weight - olderWeight : null,
      bodyFatDelta: fat != null && olderFat != null ? fat - olderFat : null,
      muscleDelta: muscle != null && olderMuscle != null ? muscle - olderMuscle : null,
    };
  });
}

export function chartSeriesFromCheckins(
  checkins: NutritionCheckin[],
  field: "weight_kg" | "waist_cm" | "abdomen_cm"
): Array<{ date: string; value: number }> {
  return sortedCheckinsAsc(activeCheckins(checkins))
    .filter((c) => num(c[field]) != null)
    .map((c) => ({
      date: c.checkin_date,
      value: num(c[field]) as number,
    }));
}

export function chartSeriesFromComposition(
  entries: BodyCompositionEntry[],
  field: "body_fat_percent" | "muscle_mass_kg"
): Array<{ date: string; value: number }> {
  return sortedCompositionAsc(activeComposition(entries))
    .filter((e) => num(e[field]) != null)
    .map((e) => ({
      date: e.measured_at,
      value: num(e[field]) as number,
    }));
}

export function formatMetric(value: number | null | undefined, unit: string): string {
  if (value == null || !Number.isFinite(value)) return "sin dato";
  return `${value.toFixed(1)} ${unit}`;
}

export function formatDelta(value: number | null | undefined, unit: string): string {
  if (value == null || !Number.isFinite(value)) return "sin dato";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)} ${unit}`;
}

export function deltaTone(value: number | null | undefined): "up" | "down" | "neutral" {
  if (value == null || !Number.isFinite(value) || Math.abs(value) < 0.05) return "neutral";
  return value > 0 ? "up" : "down";
}
