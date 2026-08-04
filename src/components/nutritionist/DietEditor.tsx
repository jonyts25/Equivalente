"use client";

import { useState } from "react";
import { ManualAiFlow } from "@/components/manual-ai/ManualAiFlow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { parseAndSaveDiet, saveDietPlan } from "@/app/actions/diet";

interface DietEditorProps {
  patientId: string;
  initialRawText?: string;
  initialTitle?: string;
}

function defaultDietTitle(): string {
  const today = new Date().toLocaleDateString("es-MX", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return `Dieta cargada ${today}`;
}

export function DietEditor({
  patientId,
  initialRawText = "",
  initialTitle = "",
}: DietEditorProps) {
  const [dietTitle, setDietTitle] = useState(initialTitle);
  const [rawText, setRawText] = useState(initialRawText);
  const [pastedResponse, setPastedResponse] = useState("");
  const [validatedData, setValidatedData] = useState<Record<string, unknown> | null>(null);
  const [savingBasic, setSavingBasic] = useState(false);
  const [savingParsed, setSavingParsed] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function resolveTitle(): string {
    const trimmed = dietTitle.trim();
    return trimmed || defaultDietTitle();
  }

  async function handleSaveBasic() {
    if (!rawText.trim()) return;
    setSavingBasic(true);
    setMessage(null);
    try {
      await saveDietPlan({
        patientId,
        title: resolveTitle(),
        rawText: rawText.trim(),
      });
      setMessage("Dieta guardada como activa.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSavingBasic(false);
    }
  }

  async function handleSaveParsed() {
    if (!rawText.trim() || !pastedResponse.trim()) return;
    setSavingParsed(true);
    setMessage(null);
    try {
      await parseAndSaveDiet({ patientId, rawText, pastedResponse });
      setMessage("Dieta estructurada y guardada como activa.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setSavingParsed(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="diet-title">Nombre de la dieta</Label>
        <Input
          id="diet-title"
          value={dietTitle}
          onChange={(e) => setDietTitle(e.target.value)}
          placeholder="Ej. Menú Keto Semana 1"
        />
      </div>

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

      <Button
        type="button"
        onClick={handleSaveBasic}
        disabled={!rawText.trim() || savingBasic}
      >
        {savingBasic ? "Guardando…" : "Guardar dieta"}
      </Button>

      <div className="space-y-3 rounded-lg border border-slate-200 p-4">
        <div>
          <h3 className="text-sm font-medium text-slate-800">
            Estructurar con IA (opcional)
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            No es requisito para guardar la dieta. Úsalo solo si quieres parsear
            automáticamente a tiempos de comida (meal_slots).
          </p>
        </div>
        <ManualAiFlow
          task="parse_diet"
          context={{ rawDiet: rawText }}
          pastedResponse={pastedResponse}
          onPastedResponseChange={setPastedResponse}
          onValidated={setValidatedData}
          onSave={handleSaveParsed}
          canSave={Boolean(validatedData && rawText.trim())}
          saving={savingParsed}
        />
        {validatedData && (
          <pre className="max-h-48 overflow-auto rounded bg-slate-50 p-3 text-xs">
            {JSON.stringify(validatedData, null, 2)}
          </pre>
        )}
      </div>

      {message && <p className="text-sm text-emerald-700">{message}</p>}
    </div>
  );
}
