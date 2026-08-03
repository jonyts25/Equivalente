"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CopyPromptButtonProps {
  prompt: string;
  onCopied?: () => void;
}

export function CopyPromptButton({ prompt, onCopied }: CopyPromptButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      onCopied?.();
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("No se pudo copiar. Selecciona el texto manualmente.");
    }
  }

  return (
    <Button type="button" variant="secondary" onClick={handleCopy}>
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {copied ? "Copiado" : "Copiar prompt"}
    </Button>
  );
}
