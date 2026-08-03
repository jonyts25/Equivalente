"use client";

import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getChatGptUrl } from "@/lib/ai";

export function OpenChatGPTButton() {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => window.open(getChatGptUrl(), "_blank", "noopener,noreferrer")}
    >
      <ExternalLink className="h-4 w-4" />
      Abrir ChatGPT
    </Button>
  );
}
