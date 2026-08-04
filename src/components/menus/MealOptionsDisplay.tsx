import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  mealOptionsResponseSchema,
  type MealOptionsResponse,
} from "@/lib/ai/schemas/meal-options.schema";

function extractJsonCandidate(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenceMatch) return fenceMatch[1].trim();
  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }
  return trimmed;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(extractJsonCandidate(value)) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return { raw: value };
    }
  }
  return value == null ? null : { raw: value };
}

/** Unwrap meal-options JSON from worker wrappers ({ texto }, etc.) or direct payload. */
export function parseMealOptionsContent(content: unknown): MealOptionsResponse | null {
  const preview = asRecord(content);
  if (!preview) return null;

  const direct = mealOptionsResponseSchema.safeParse(preview);
  if (direct.success) return direct.data;

  for (const key of ["result", "data", "content", "raw", "texto"] as const) {
    const value = preview[key];
    if (typeof value === "string") {
      try {
        const parsed = mealOptionsResponseSchema.safeParse(
          JSON.parse(extractJsonCandidate(value))
        );
        if (parsed.success) return parsed.data;
      } catch {
        /* ignore */
      }
    } else if (value && typeof value === "object") {
      const nested = value as Record<string, unknown>;
      if (key !== "texto" && typeof nested.texto === "string") {
        const fromNested = parseMealOptionsContent(nested);
        if (fromNested) return fromNested;
      }
      const parsed = mealOptionsResponseSchema.safeParse(value);
      if (parsed.success) return parsed.data;
    }
  }

  return null;
}

function confidenceBadgeVariant(
  confidence: "low" | "medium" | "high"
): "default" | "warning" | "secondary" {
  if (confidence === "high") return "default";
  if (confidence === "medium") return "warning";
  return "secondary";
}

interface MealOptionsDisplayProps {
  content: unknown;
}

export function MealOptionsDisplay({ content }: MealOptionsDisplayProps) {
  const parsed = parseMealOptionsContent(content);

  if (parsed?.options && parsed.options.length > 0) {
    return (
      <div className="space-y-3">
        {parsed.message && <p className="text-sm text-slate-600">{parsed.message}</p>}
        {parsed.options.map((option, index) => (
          <Card key={`${option.title}-${index}`}>
            <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
              <div className="space-y-2">
                <CardTitle className="text-base">{option.title}</CardTitle>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="outline">{option.meal_slot}</Badge>
                  <Badge variant={confidenceBadgeVariant(option.confidence)}>
                    {option.confidence}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ul className="space-y-1">
                {option.ingredients.map((ing, i) => (
                  <li key={`${ing.name}-${i}`}>
                    <span className="font-medium">{ing.name}</span>
                    {ing.portion ? ` — ${ing.portion}` : ""}
                    {ing.notes ? (
                      <span className="text-slate-500"> ({ing.notes})</span>
                    ) : null}
                  </li>
                ))}
              </ul>

              {option.preparation && (
                <p className="text-slate-700">{option.preparation}</p>
              )}

              {option.replaces && (
                <p className="text-xs text-slate-500">Reemplaza: {option.replaces}</p>
              )}

              {option.equivalences.length > 0 && (
                <ul className="space-y-1 text-xs text-slate-500">
                  {option.equivalences.map((eq, i) => (
                    <li key={`${eq.base}-${eq.replacement}-${i}`}>
                      {eq.base} → {eq.replacement}
                      {eq.explanation ? `: ${eq.explanation}` : ""}
                    </li>
                  ))}
                </ul>
              )}

              {option.warnings && option.warnings.length > 0 && (
                <Alert>
                  <AlertTitle>Advertencias</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc space-y-1 pl-4">
                      {option.warnings.map((warning, i) => (
                        <li key={`${warning}-${i}`}>{warning}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <pre className="max-h-72 overflow-auto rounded-lg border bg-white p-3 text-xs">
      {typeof content === "string" ? content : JSON.stringify(content ?? {}, null, 2)}
    </pre>
  );
}
