"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PromptPreviewCardProps {
  prompt: string;
  title?: string;
}

export function PromptPreviewCard({ prompt, title = "Prompt para ChatGPT" }: PromptPreviewCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
          {prompt}
        </pre>
      </CardContent>
    </Card>
  );
}
