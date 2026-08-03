"use client";

import { useState } from "react";
import { ManualAiFlow } from "@/components/manual-ai/ManualAiFlow";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { parseAndSaveDiet } from "@/app/actions/diet";

interface DietEditorProps {
  patientId: string;
  initialRawText?: string;
}

export function DietEditor({ patientId, initialRawText = "" }: DietEditorProps) {
  const [rawText, setRawText] = useState(initialRawText);
  const [pastedResponse, setPastedResponse] = useState("");
  const [validatedData, setValidatedData] = useState<Record<string, unknown> | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSave() {
    if (!rawText.trim() || !pastedResponse.trim()) return;
    setSaving(true);
    setMessage(null);
    try {
      await parseAndSaveDiet({ patientId, rawText, pastedResponse });
      setMessage("Dieta guardada como activa.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="raw-diet">Pega la dieta prescrita (texto)</Label>
        <Textarea
          id="raw-diet"
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="Pega aquí la dieta de la nutrióloga..."
          className="min-h-[120px]"
        />
      </div>
      <ManualAiFlow
        task="parse_diet"
        context={{ rawDiet: rawText }}
        pastedResponse={pastedResponse}
        onPastedResponseChange={setPastedResponse}
        onValidated={setValidatedData}
        onSave={handleSave}
        canSave={Boolean(validatedData && rawText.trim())}
        saving={saving}
      />
      {validatedData && (
        <pre className="max-h-48 overflow-auto rounded bg-slate-50 p-3 text-xs">
          {JSON.stringify(validatedData, null, 2)}
        </pre>
      )}
      {message && <p className="text-sm text-emerald-700">{message}</p>}
    </div>
  );
}
