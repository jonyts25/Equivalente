"use client";

import { useState } from "react";
import { ManualAiFlow } from "@/components/manual-ai/ManualAiFlow";
import { validateAndSaveMenu } from "@/app/actions/menus";
import type { ManualAiTaskType, MenuStatus } from "@/types/database";

interface ManualMenuGeneratorProps {
  patientId: string;
  task: ManualAiTaskType;
  context: Record<string, string | number | undefined>;
  title: string;
  defaultStatus?: MenuStatus;
}

export function ManualMenuGenerator({
  patientId,
  task,
  context,
  title,
  defaultStatus,
}: ManualMenuGeneratorProps) {
  const [pastedResponse, setPastedResponse] = useState("");
  const [validatedData, setValidatedData] = useState<Record<string, unknown> | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSave() {
    if (!validatedData || !pastedResponse.trim()) return;
    setSaving(true);
    setMessage(null);
    try {
      await validateAndSaveMenu({
        patientId,
        taskType: task,
        pastedResponse,
        title,
        context,
        status: defaultStatus,
      });
      setMessage("Menú guardado.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <ManualAiFlow
        task={task}
        context={context}
        pastedResponse={pastedResponse}
        onPastedResponseChange={setPastedResponse}
        onValidated={setValidatedData}
        onSave={handleSave}
        canSave={Boolean(validatedData)}
        saving={saving}
      />
      {message && <p className="text-sm text-emerald-700">{message}</p>}
    </div>
  );
}
