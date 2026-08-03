"use client";

import { useState } from "react";
import { detectAmbiguity } from "@/lib/nutrition/ambiguity-detector";
import { ManualAiFlow } from "@/components/manual-ai/ManualAiFlow";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { validateAndSaveMenu } from "@/app/actions/menus";
import type { PrecisionMode } from "@/types/database";

interface CravingCheckerProps {
  patientId: string;
  patientName: string;
  precisionMode: PrecisionMode;
  promptContext: Record<string, string>;
}

export function CravingChecker({
  patientId,
  patientName,
  precisionMode,
  promptContext,
}: CravingCheckerProps) {
  const [craving, setCraving] = useState("");
  const [clarification, setClarification] = useState("");
  const [checked, setChecked] = useState(false);
  const [ambiguityResult, setAmbiguityResult] = useState<ReturnType<typeof detectAmbiguity> | null>(null);
  const [pastedResponse, setPastedResponse] = useState("");
  const [validatedData, setValidatedData] = useState<Record<string, unknown> | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [clarificationApproved, setClarificationApproved] = useState(false);

  function handleCheckAmbiguity() {
    const result = detectAmbiguity(craving, precisionMode);
    setAmbiguityResult(result);
    setChecked(true);
    setClarificationApproved(result.status === "ok");
  }

  const canProceed =
    checked &&
    ambiguityResult &&
    ambiguityResult.status === "ok";

  const needsClarification =
    checked && ambiguityResult?.status === "requires_clarification";

  const aiContext = {
    patientName,
    craving,
    precisionMode,
    clarificationAnswers: clarification,
    ...promptContext,
  };

  async function handleSave() {
    if (!validatedData || !pastedResponse.trim()) return;
    setSaving(true);
    try {
      await validateAndSaveMenu({
        patientId,
        taskType: "craving_check",
        pastedResponse,
        title: `Antojo: ${craving}`,
        context: aiContext,
        status: "pending_review",
      });
      setMessage("Guardado como pendiente de revisión por tu nutrióloga.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="craving">¿Qué se te antojó?</Label>
        <Input
          id="craving"
          value={craving}
          onChange={(e) => {
            setCraving(e.target.value);
            setChecked(false);
            setClarificationApproved(false);
          }}
          placeholder="Ej: mazapán de chocolate, crema de cacahuate..."
        />
      </div>
      <Button type="button" onClick={handleCheckAmbiguity} disabled={!craving.trim()}>
        Verificar porción y ambigüedad
      </Button>

      {needsClarification && ambiguityResult && (
        <Alert>
          <AlertTitle>No me dejes hacerme trampa</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>{ambiguityResult.message}</p>
            {ambiguityResult.questions.map((q) => (
              <p key={q} className="font-medium">{q}</p>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {needsClarification && (
        <div className="space-y-2">
          <Label htmlFor="clarification">Tu aclaración</Label>
          <Input
            id="clarification"
            value={clarification}
            onChange={(e) => setClarification(e.target.value)}
            placeholder="Ej: pieza individual estándar de mazapán"
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              const result = detectAmbiguity(`${craving} ${clarification}`, precisionMode);
              setAmbiguityResult(result);
              setClarificationApproved(result.status === "ok");
            }}
          >
            Revisar con aclaración
          </Button>
        </div>
      )}

      {(canProceed || (needsClarification && clarificationApproved)) && (
        <ManualAiFlow
          task="craving_check"
          context={aiContext}
          pastedResponse={pastedResponse}
          onPastedResponseChange={setPastedResponse}
          onValidated={setValidatedData}
          onSave={handleSave}
          canSave={Boolean(validatedData)}
          saving={saving}
        />
      )}

      {message && <p className="text-sm text-emerald-700">{message}</p>}
    </div>
  );
}
