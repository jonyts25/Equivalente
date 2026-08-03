"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  restoreCheckin,
  restoreComposition,
  setCheckinVisibility,
  setCompositionVisibility,
  softDeleteCheckin,
  softDeleteComposition,
  updateBodyCompositionEntry,
  updateNutritionCheckin,
} from "@/app/actions/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DeltaCell, SourceBadge, VisibilityBadge } from "@/components/progress/ProgressMetrics";
import type {
  BodyCompositionEntry,
  NutritionCheckin,
  ProgressConfidence,
} from "@/lib/progress/types";
import type { CheckinWithDeltas, CompositionWithDeltas } from "@/lib/progress/summary";

function parseNum(v: string): number | null {
  const trimmed = v.trim();
  if (!trimmed) return null;
  const n = parseFloat(trimmed.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function SimpleModal({
  title,
  open,
  onClose,
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-2">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-4 shadow-lg">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="font-semibold text-sm">{title}</h3>
          <Button type="button" size="sm" variant="ghost" onClick={onClose}>Cerrar</Button>
        </div>
        {children}
      </div>
    </div>
  );
}

const CONFIDENCE_OPTIONS: ProgressConfidence[] = ["alta", "media", "baja", "dudoso"];

export function ProgressCheckinsTable({
  patientId,
  rows,
}: {
  patientId: string;
  rows: CheckinWithDeltas[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<NutritionCheckin | null>(null);
  const [loading, setLoading] = useState(false);

  async function run(action: () => Promise<void>) {
    setLoading(true);
    try {
      await action();
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b text-left">
              <th className="p-2">Fecha</th>
              <th className="p-2">Peso</th>
              <th className="p-2">Δ peso</th>
              <th className="p-2">Cintura</th>
              <th className="p-2">Δ cint.</th>
              <th className="p-2">Abdomen</th>
              <th className="p-2">Tórax</th>
              <th className="p-2">Fuente</th>
              <th className="p-2">Pac.</th>
              <th className="p-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className={`border-b ${c.is_deleted ? "opacity-50" : ""}`}>
                <td className="p-2 whitespace-nowrap">{c.checkin_date}</td>
                <td className="p-2 tabular-nums">{c.weight_kg ?? "—"}</td>
                <td className="p-2"><DeltaCell value={c.weightDelta} unit="kg" invertColors /></td>
                <td className="p-2 tabular-nums">{c.waist_cm ?? "—"}</td>
                <td className="p-2"><DeltaCell value={c.waistDelta} unit="cm" invertColors /></td>
                <td className="p-2 tabular-nums">{c.abdomen_cm ?? "—"}</td>
                <td className="p-2 tabular-nums">{c.chest_cm ?? "—"}</td>
                <td className="p-2"><SourceBadge source={c.source} confidence={c.confidence} /></td>
                <td className="p-2"><VisibilityBadge visible={c.visible_to_patient} /></td>
                <td className="p-2">
                  <RowActions
                    loading={loading}
                    isDeleted={c.is_deleted}
                    visible={c.visible_to_patient}
                    onEdit={() => setEditing(c)}
                    onToggleVisible={() => void run(() => setCheckinVisibility(c.id, patientId, !c.visible_to_patient))}
                    onDelete={() => void run(() => softDeleteCheckin(c.id, patientId))}
                    onRestore={() => void run(() => restoreCheckin(c.id, patientId))}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <CheckinEditModal
          checkin={editing}
          loading={loading}
          onClose={() => setEditing(null)}
          onSave={async (values) => {
            await run(async () => {
              await updateNutritionCheckin(editing.id, patientId, values);
              setEditing(null);
            });
          }}
        />
      )}
    </>
  );
}

export function ProgressCompositionTable({
  patientId,
  rows,
}: {
  patientId: string;
  rows: CompositionWithDeltas[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<BodyCompositionEntry | null>(null);
  const [loading, setLoading] = useState(false);

  async function run(action: () => Promise<void>) {
    setLoading(true);
    try {
      await action();
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b text-left">
              <th className="p-2">Fecha</th>
              <th className="p-2">Peso</th>
              <th className="p-2">Δ peso</th>
              <th className="p-2">% grasa</th>
              <th className="p-2">Δ grasa</th>
              <th className="p-2">Músculo</th>
              <th className="p-2">Fuente</th>
              <th className="p-2">Pac.</th>
              <th className="p-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e.id} className={`border-b ${e.is_deleted ? "opacity-50" : ""}`}>
                <td className="p-2 whitespace-nowrap">{e.measured_at}</td>
                <td className="p-2 tabular-nums">{e.weight_kg ?? "—"}</td>
                <td className="p-2"><DeltaCell value={e.weightDelta} unit="kg" invertColors /></td>
                <td className="p-2 tabular-nums">{e.body_fat_percent ?? "—"}</td>
                <td className="p-2"><DeltaCell value={e.bodyFatDelta} unit="%" invertColors /></td>
                <td className="p-2 tabular-nums">{e.muscle_mass_kg ?? "—"}</td>
                <td className="p-2"><SourceBadge source={e.source} confidence={e.confidence} /></td>
                <td className="p-2"><VisibilityBadge visible={e.visible_to_patient} /></td>
                <td className="p-2">
                  <RowActions
                    loading={loading}
                    isDeleted={e.is_deleted}
                    visible={e.visible_to_patient}
                    onEdit={() => setEditing(e)}
                    onToggleVisible={() => void run(() => setCompositionVisibility(e.id, patientId, !e.visible_to_patient))}
                    onDelete={() => void run(() => softDeleteComposition(e.id, patientId))}
                    onRestore={() => void run(() => restoreComposition(e.id, patientId))}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <CompositionEditModal
          entry={editing}
          loading={loading}
          onClose={() => setEditing(null)}
          onSave={async (values) => {
            await run(async () => {
              await updateBodyCompositionEntry(editing.id, patientId, values);
              setEditing(null);
            });
          }}
        />
      )}
    </>
  );
}

function RowActions({
  loading,
  isDeleted,
  visible,
  onEdit,
  onToggleVisible,
  onDelete,
  onRestore,
}: {
  loading: boolean;
  isDeleted: boolean;
  visible: boolean;
  onEdit: () => void;
  onToggleVisible: () => void;
  onDelete: () => void;
  onRestore: () => void;
}) {
  if (isDeleted) {
    return (
      <Button size="sm" variant="secondary" disabled={loading} onClick={onRestore}>
        Restaurar
      </Button>
    );
  }
  return (
    <div className="flex flex-wrap gap-1">
      <Button size="sm" variant="outline" disabled={loading} onClick={onEdit}>Editar</Button>
      <Button size="sm" variant="outline" disabled={loading} onClick={onToggleVisible}>
        {visible ? "Ocultar" : "Visible"}
      </Button>
      <Button size="sm" variant="destructive" disabled={loading} onClick={onDelete}>Borrar</Button>
    </div>
  );
}

function CheckinEditModal({
  checkin,
  loading,
  onClose,
  onSave,
}: {
  checkin: NutritionCheckin;
  loading: boolean;
  onClose: () => void;
  onSave: (values: Parameters<typeof updateNutritionCheckin>[2]) => Promise<void>;
}) {
  const [form, setForm] = useState({
    checkinDate: checkin.checkin_date,
    bloodPressureText: checkin.blood_pressure_text ?? "",
    dietLabel: checkin.diet_label ?? "",
    weightKg: String(checkin.weight_kg ?? ""),
    chestCm: String(checkin.chest_cm ?? ""),
    waistCm: String(checkin.waist_cm ?? ""),
    abdomenCm: String(checkin.abdomen_cm ?? ""),
    hipCm: String(checkin.hip_cm ?? ""),
    neckCm: String(checkin.neck_cm ?? ""),
    notes: checkin.notes ?? "",
    confidence: checkin.confidence ?? "",
    visibleToPatient: checkin.visible_to_patient,
  });

  return (
    <SimpleModal title="Editar check-in" open onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void onSave({
            checkinDate: form.checkinDate,
            bloodPressureText: form.bloodPressureText || null,
            dietLabel: form.dietLabel || null,
            weightKg: parseNum(form.weightKg),
            chestCm: parseNum(form.chestCm),
            waistCm: parseNum(form.waistCm),
            abdomenCm: parseNum(form.abdomenCm),
            hipCm: parseNum(form.hipCm),
            neckCm: parseNum(form.neckCm),
            notes: form.notes || null,
            confidence: (form.confidence as ProgressConfidence) || null,
            visibleToPatient: form.visibleToPatient,
          });
        }}
      >
        <Field label="Fecha" type="date" value={form.checkinDate} onChange={(v) => setForm({ ...form, checkinDate: v })} />
        <Field label="T/A" value={form.bloodPressureText} onChange={(v) => setForm({ ...form, bloodPressureText: v })} />
        <Field label="Dieta / indicación" value={form.dietLabel} onChange={(v) => setForm({ ...form, dietLabel: v })} />
        <div className="grid grid-cols-2 gap-2">
          <Field label="Peso kg" value={form.weightKg} onChange={(v) => setForm({ ...form, weightKg: v })} />
          <Field label="Cintura cm" value={form.waistCm} onChange={(v) => setForm({ ...form, waistCm: v })} />
          <Field label="Abdomen cm" value={form.abdomenCm} onChange={(v) => setForm({ ...form, abdomenCm: v })} />
          <Field label="Tórax cm" value={form.chestCm} onChange={(v) => setForm({ ...form, chestCm: v })} />
          <Field label="Cadera cm" value={form.hipCm} onChange={(v) => setForm({ ...form, hipCm: v })} />
          <Field label="Cuello cm" value={form.neckCm} onChange={(v) => setForm({ ...form, neckCm: v })} />
        </div>
        <div className="space-y-1">
          <Label>Notas</Label>
          <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
        </div>
        <div className="space-y-1">
          <Label>Confianza</Label>
          <select
            className="w-full rounded-md border px-2 py-1.5 text-sm"
            value={form.confidence}
            onChange={(e) => setForm({ ...form, confidence: e.target.value })}
          >
            <option value="">—</option>
            {CONFIDENCE_OPTIONS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.visibleToPatient}
            onChange={(e) => setForm({ ...form, visibleToPatient: e.target.checked })}
          />
          Visible al paciente
        </label>
        <Button type="submit" disabled={loading} className="w-full">Guardar cambios</Button>
      </form>
    </SimpleModal>
  );
}

function CompositionEditModal({
  entry,
  loading,
  onClose,
  onSave,
}: {
  entry: BodyCompositionEntry;
  loading: boolean;
  onClose: () => void;
  onSave: (values: Parameters<typeof updateBodyCompositionEntry>[2]) => Promise<void>;
}) {
  const [form, setForm] = useState({
    measuredAt: entry.measured_at,
    weightKg: String(entry.weight_kg ?? ""),
    bodyFatPercent: String(entry.body_fat_percent ?? ""),
    bodyFatMassKg: String(entry.body_fat_mass_kg ?? ""),
    boneMassKg: String(entry.bone_mass_kg ?? ""),
    waterPercent: String(entry.water_percent ?? ""),
    muscleMassKg: String(entry.muscle_mass_kg ?? ""),
    physiqueRating: String(entry.physique_rating ?? ""),
    kcal: String(entry.kcal ?? ""),
    metabolicAge: String(entry.metabolic_age ?? ""),
    visceralFat: String(entry.visceral_fat ?? ""),
    notes: entry.notes ?? "",
    confidence: entry.confidence ?? "",
    visibleToPatient: entry.visible_to_patient,
  });

  return (
    <SimpleModal title="Editar composición" open onClose={onClose}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void onSave({
            measuredAt: form.measuredAt,
            weightKg: parseNum(form.weightKg),
            bodyFatPercent: parseNum(form.bodyFatPercent),
            bodyFatMassKg: parseNum(form.bodyFatMassKg),
            boneMassKg: parseNum(form.boneMassKg),
            waterPercent: parseNum(form.waterPercent),
            muscleMassKg: parseNum(form.muscleMassKg),
            physiqueRating: parseNum(form.physiqueRating),
            kcal: parseNum(form.kcal),
            metabolicAge: parseNum(form.metabolicAge),
            visceralFat: parseNum(form.visceralFat),
            notes: form.notes || null,
            confidence: (form.confidence as ProgressConfidence) || null,
            visibleToPatient: form.visibleToPatient,
          });
        }}
      >
        <Field label="Fecha" type="date" value={form.measuredAt} onChange={(v) => setForm({ ...form, measuredAt: v })} />
        <div className="grid grid-cols-2 gap-2">
          <Field label="Peso kg" value={form.weightKg} onChange={(v) => setForm({ ...form, weightKg: v })} />
          <Field label="% grasa" value={form.bodyFatPercent} onChange={(v) => setForm({ ...form, bodyFatPercent: v })} />
          <Field label="Masa grasa kg" value={form.bodyFatMassKg} onChange={(v) => setForm({ ...form, bodyFatMassKg: v })} />
          <Field label="Masa ósea kg" value={form.boneMassKg} onChange={(v) => setForm({ ...form, boneMassKg: v })} />
          <Field label="% agua" value={form.waterPercent} onChange={(v) => setForm({ ...form, waterPercent: v })} />
          <Field label="Masa muscular kg" value={form.muscleMassKg} onChange={(v) => setForm({ ...form, muscleMassKg: v })} />
          <Field label="Complexión" value={form.physiqueRating} onChange={(v) => setForm({ ...form, physiqueRating: v })} />
          <Field label="Kcal" value={form.kcal} onChange={(v) => setForm({ ...form, kcal: v })} />
          <Field label="Edad metab." value={form.metabolicAge} onChange={(v) => setForm({ ...form, metabolicAge: v })} />
          <Field label="Grasa visceral" value={form.visceralFat} onChange={(v) => setForm({ ...form, visceralFat: v })} />
        </div>
        <div className="space-y-1">
          <Label>Notas</Label>
          <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
        </div>
        <div className="space-y-1">
          <Label>Confianza</Label>
          <select
            className="w-full rounded-md border px-2 py-1.5 text-sm"
            value={form.confidence}
            onChange={(e) => setForm({ ...form, confidence: e.target.value })}
          >
            <option value="">—</option>
            {CONFIDENCE_OPTIONS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.visibleToPatient}
            onChange={(e) => setForm({ ...form, visibleToPatient: e.target.checked })}
          />
          Visible al paciente
        </label>
        <Button type="submit" disabled={loading} className="w-full">Guardar cambios</Button>
      </form>
    </SimpleModal>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input type={type} className="h-8 text-sm" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
