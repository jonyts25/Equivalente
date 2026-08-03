"use client";

import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SharePromptButtonProps {
  prompt: string;
  title?: string;
}

export function SharePromptButton({
  prompt,
  title = "Prompt Equivalente",
}: SharePromptButtonProps) {
  async function handleShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text: prompt });
        return;
      } catch {
        // user cancelled or failed — fall through to copy
      }
    }
    try {
      await navigator.clipboard.writeText(prompt);
      alert("Prompt copiado al portapapeles.");
    } catch {
      alert("Compartir no disponible. Usa Copiar prompt.");
    }
  }

  if (typeof navigator !== "undefined" && !navigator.share) {
    return null;
  }

  return (
    <Button type="button" variant="ghost" onClick={handleShare}>
      <Share2 className="h-4 w-4" />
      Compartir prompt
    </Button>
  );
}
