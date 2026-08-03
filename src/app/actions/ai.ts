"use server";

import { getCurrentProfile } from "@/lib/auth/session";
import { runAiTask } from "@/lib/ai/provider-router";
import type { AiModeResult, AiTaskType, PromptContext } from "@/lib/ai/types";

export async function prepareAiTask(input: {
  taskType: AiTaskType;
  context: PromptContext;
  patientId?: string;
}): Promise<AiModeResult> {
  const profile = await getCurrentProfile();
  if (!profile) throw new Error("No autenticado");

  return runAiTask({
    userId: profile.id,
    patientId: input.patientId,
    role: profile.role,
    taskType: input.taskType,
    input: input.context,
  });
}
