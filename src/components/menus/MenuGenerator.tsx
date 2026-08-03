import { getActiveProvider } from "@/lib/ai/config";
import { ManualMenuGenerator } from "@/components/menus/ManualMenuGenerator";
import { QueuedMenuGenerator } from "@/components/menus/QueuedMenuGenerator";
import type { ManualAiTaskType, MenuStatus } from "@/types/database";

export interface MenuGeneratorProps {
  patientId: string;
  task: ManualAiTaskType;
  context: Record<string, string | number | undefined>;
  title: string;
  defaultStatus?: MenuStatus;
}

/**
 * Server wrapper: picks manual ChatGPT flow vs ollama_queue polling UI
 * according to AI_PROVIDER. Does not delete ManualMenuGenerator / ManualAiFlow.
 */
export function MenuGenerator(props: MenuGeneratorProps) {
  const provider = getActiveProvider();

  if (provider === "ollama_queue") {
    return <QueuedMenuGenerator {...props} />;
  }

  return <ManualMenuGenerator {...props} />;
}
