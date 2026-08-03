"use client";

import { useState } from "react";
import { saveForbiddenTreat } from "@/app/actions/diet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MODES = [
  { value: "never_suggest", label: "No sugerir nunca" },
  { value: "adapted_only", label: "Solo versión adaptada" },
  { value: "approval_required", label: "Solo si nutrióloga aprueba" },
  { value: "exact_portion_required", label: "Solo porción exacta" },
  { value: "sensory_alternative", label: "Alternativa sensorial" },
];

interface ForbiddenTreatFormProps {
  patientId: string;
}

export function ForbiddenTreatForm({ patientId }: ForbiddenTreatFormProps) {
  const [name, setName] = useState("");
  const [mode, setMode] = useState("exact_portion_required");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await saveForbiddenTreat({ patientId, name, mode, triggerRisk: 4 });
      setMessage("Gusto prohibido registrado.");
      setName("");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="ft-name">Alimento</Label>
        <Input id="ft-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ft-mode">Modo</Label>
        <select
          id="ft-mode"
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          className="h-10 w-full rounded-lg border px-3 text-sm"
        >
          {MODES.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>
      <Button type="submit">Agregar</Button>
      {message && <p className="text-sm text-emerald-700">{message}</p>}
    </form>
  );
}
