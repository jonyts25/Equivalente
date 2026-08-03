"use client";

import { buildPrompt } from "@/lib/ai";
import type { AiTaskType } from "@/lib/ai";
import { PromptPreviewCard } from "./PromptPreviewCard";
import { CopyPromptButton } from "./CopyPromptButton";
import { OpenChatGPTButton } from "./OpenChatGPTButton";
import { SharePromptButton } from "./SharePromptButton";
import { PasteChatGPTResponseBox } from "./PasteChatGPTResponseBox";
import { ValidateManualAIResponseButton } from "./ValidateManualAIResponseButton";
import { Button } from "@/components/ui/button";

interface ManualAiFlowProps {
  task: AiTaskType;
  context: Record<string, string | number | undefined>;
  pastedResponse: string;
  onPastedResponseChange: (value: string) => void;
  onValidated: (data: Record<string, unknown>) => void;
  onSave?: () => void;
  canSave?: boolean;
  saving?: boolean;
}

export function ManualAiFlow({
  task,
  context,
  pastedResponse,
  onPastedResponseChange,
  onValidated,
  onSave,
  canSave = false,
  saving = false,
}: ManualAiFlowProps) {
  const prompt = buildPrompt(task, context);

  return (
    <div className="space-y-4">
      <PromptPreviewCard prompt={prompt} />
      <div className="flex flex-wrap gap-2">
        <CopyPromptButton prompt={prompt} />
        <OpenChatGPTButton />
        <SharePromptButton prompt={prompt} />
      </div>
      <PasteChatGPTResponseBox value={pastedResponse} onChange={onPastedResponseChange} />
      <ValidateManualAIResponseButton
        task={task}
        response={pastedResponse}
        onValidated={onValidated}
      />
      {onSave && (
        <Button type="button" onClick={onSave} disabled={!canSave || saving}>
          {saving ? "Guardando..." : "Guardar resultado"}
        </Button>
      )}
    </div>
  );
}
