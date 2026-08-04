"use client";

import { useState } from "react";
import { saveDietTemplate } from "@/app/actions/diet-templates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function DietTemplateForm() {
  const [title, setTitle] = useState("");
  const [rawText, setRawText] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await saveDietTemplate({ title, rawText });
      setMessage("Plantilla guardada.");
      setTitle("");
      setRawText("");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="template-title">Nombre de la dieta</Label>
        <Input
          id="template-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ej. Menú Keto Semana 1"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="template-raw">Texto de la dieta</Label>
        <Textarea
          id="template-raw"
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="Pega aquí la dieta base reutilizable..."
          className="min-h-[140px]"
          required
        />
      </div>
      <Button type="submit" disabled={saving || !title.trim() || !rawText.trim()}>
        {saving ? "Guardando…" : "Guardar"}
      </Button>
      {message && <p className="text-sm text-emerald-700">{message}</p>}
    </form>
  );
}
