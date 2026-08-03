"use client";

import { useState } from "react";
import { saveEquivalenceGroup } from "@/app/actions/diet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EquivalenceFormProps {
  patientId: string;
}

export function EquivalenceForm({ patientId }: EquivalenceFormProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("protein");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await saveEquivalenceGroup({ patientId, name, category });
      setMessage("Grupo creado.");
      setName("");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="eq-name">Nombre del grupo</Label>
        <Input id="eq-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Proteína desayuno" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="eq-cat">Categoría</Label>
        <Input id="eq-cat" value={category} onChange={(e) => setCategory(e.target.value)} />
      </div>
      <Button type="submit">Crear grupo</Button>
      {message && <p className="text-sm text-emerald-700">{message}</p>}
    </form>
  );
}
