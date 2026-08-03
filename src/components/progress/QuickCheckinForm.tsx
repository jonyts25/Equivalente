"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createBodyCompositionEntry,
  createNutritionCheckin,
} from "@/app/actions/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

function parseNum(value: string): number | null {
  const n = parseFloat(value.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function QuickCheckinForm({ patientId }: { patientId: string }) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [checkinDate, setCheckinDate] = useState(today);
  const [weight, setWeight] = useState("");
  const [chest, setChest] = useState("");
  const [waist, setWaist] = useState("");
  const [abdomen, setAbdomen] = useState("");
  const [hip, setHip] = useState("");
  const [dietLabel, setDietLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [muscleMass, setMuscleMass] = useState("");
  const [water, setWater] = useState("");
  const [visceralFat, setVisceralFat] = useState("");
  const [metabolicAge, setMetabolicAge] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      await createNutritionCheckin({
        patientId,
        checkinDate,
        weightKg: parseNum(weight),
        chestCm: parseNum(chest),
        waistCm: parseNum(waist),
        abdomenCm: parseNum(abdomen),
        hipCm: parseNum(hip),
        dietLabel: dietLabel || null,
        notes: notes || null,
      });

      const hasComp =
        bodyFat || muscleMass || water || visceralFat || metabolicAge || weight;
      if (hasComp) {
        await createBodyCompositionEntry({
          patientId,
          measuredAt: checkinDate,
          weightKg: parseNum(weight),
          bodyFatPercent: parseNum(bodyFat),
          muscleMassKg: parseNum(muscleMass),
          waterPercent: parseNum(water),
          visceralFat: parseNum(visceralFat),
          metabolicAge: parseNum(metabolicAge),
          notes: notes ? `Vinculado a check-in: ${notes}` : null,
        });
      }

      setMessage("Guardado.");
      router.push(`/nutriologo/pacientes/${patientId}/seguimiento`);
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="date">Fecha</Label>
          <Input id="date" type="date" value={checkinDate} onChange={(e) => setCheckinDate(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="weight">Peso (kg)</Label>
          <Input id="weight" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="Ej. 85.2" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="chest">Tórax (cm)</Label>
          <Input id="chest" inputMode="decimal" value={chest} onChange={(e) => setChest(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="waist">Cintura (cm)</Label>
          <Input id="waist" inputMode="decimal" value={waist} onChange={(e) => setWaist(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="abdomen">Abdomen (cm)</Label>
          <Input id="abdomen" inputMode="decimal" value={abdomen} onChange={(e) => setAbdomen(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="hip">Cadera (cm)</Label>
          <Input id="hip" inputMode="decimal" value={hip} onChange={(e) => setHip(e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="diet">Dieta / indicación</Label>
        <Input id="diet" value={dietLabel} onChange={(e) => setDietLabel(e.target.value)} placeholder="Ej. Plan activo" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notas</Label>
        <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </div>

      <details className="rounded border p-3">
        <summary className="cursor-pointer text-sm font-medium">Composición corporal (opcional)</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="bf">% grasa</Label>
            <Input id="bf" inputMode="decimal" value={bodyFat} onChange={(e) => setBodyFat(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mm">Masa muscular (kg)</Label>
            <Input id="mm" inputMode="decimal" value={muscleMass} onChange={(e) => setMuscleMass(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="water">% agua</Label>
            <Input id="water" inputMode="decimal" value={water} onChange={(e) => setWater(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vf">Grasa visceral</Label>
            <Input id="vf" inputMode="decimal" value={visceralFat} onChange={(e) => setVisceralFat(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ma">Edad metabólica</Label>
            <Input id="ma" inputMode="decimal" value={metabolicAge} onChange={(e) => setMetabolicAge(e.target.value)} />
          </div>
        </div>
      </details>

      <Button type="submit" disabled={loading}>
        {loading ? "Guardando…" : "Guardar seguimiento"}
      </Button>
      {message && <p className="text-sm text-emerald-700">{message}</p>}
    </form>
  );
}
