"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { validateAiResponse } from "@/lib/ai";
import type { AiTaskType } from "@/lib/ai";

interface ValidateManualAIResponseButtonProps {
  task: AiTaskType;
  response: string;
  onValidated: (data: Record<string, unknown>) => void;
}

export function ValidateManualAIResponseButton({
  task,
  response,
  onValidated,
}: ValidateManualAIResponseButtonProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleValidate() {
    const result = validateAiResponse(task, response);
    if (!result.valid) {
      setError(result.error ?? "Respuesta inválida.");
      setSuccess(false);
      return;
    }
    setError(null);
    setSuccess(true);
    if (result.data) onValidated(result.data);
  }

  return (
    <div className="space-y-3">
      <Button type="button" onClick={handleValidate} disabled={!response.trim()}>
        Validar respuesta
      </Button>
      {error && (
        <Alert className="border-red-200 bg-red-50 text-red-900">
          <AlertTitle>Error de validación</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert>
          <AlertTitle>Respuesta válida</AlertTitle>
          <AlertDescription>La estructura JSON es correcta. Puedes guardar el resultado.</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
