"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface PasteChatGPTResponseBoxProps {
  value: string;
  onChange: (value: string) => void;
}

export function PasteChatGPTResponseBox({ value, onChange }: PasteChatGPTResponseBoxProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="chatgpt-response">Pega aquí la respuesta de ChatGPT (JSON)</Label>
      <Textarea
        id="chatgpt-response"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder='Pega el JSON que devolvió ChatGPT...'
        className="min-h-[160px] font-mono text-xs"
      />
    </div>
  );
}
