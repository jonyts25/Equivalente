import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  weekMenuResponseSchema,
  type WeekMenuResponse,
} from "@/lib/ai/schemas/week-menu.schema";

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

/** Unwrap week-menu JSON from worker wrappers ({ texto }, etc.) or direct payload. */
export function parseWeekMenuContent(content: unknown): WeekMenuResponse | null {
  const preview = asRecord(content);
  if (!preview) return null;

  const direct = weekMenuResponseSchema.safeParse(preview);
  if (direct.success) return direct.data;

  for (const key of ["result", "data", "content", "raw", "texto"] as const) {
    const value = preview[key];
    if (typeof value === "string") {
      try {
        const parsed = weekMenuResponseSchema.safeParse(
          JSON.parse(extractJsonCandidate(value))
        );
        if (parsed.success) return parsed.data;
      } catch {
        /* ignore */
      }
    } else if (value && typeof value === "object") {
      const nested = value as Record<string, unknown>;
      if (key !== "texto" && typeof nested.texto === "string") {
        const fromNested = parseWeekMenuContent(nested);
        if (fromNested) return fromNested;
      }
      const parsed = weekMenuResponseSchema.safeParse(value);
      if (parsed.success) return parsed.data;
    }
  }

  return null;
}

interface WeekMenuDisplayProps {
  content: unknown;
}

export function WeekMenuDisplay({ content }: WeekMenuDisplayProps) {
  const parsed = parseWeekMenuContent(content);

  if (parsed?.days && parsed.days.length > 0) {
    const days = [...parsed.days].sort((a, b) => a.day_number - b.day_number);
    return (
      <div className="space-y-3">
        {parsed.message && <p className="text-sm text-slate-600">{parsed.message}</p>}
        {days.map((day) => (
          <Card key={`${day.day_number}-${day.day_label}`}>
            <CardHeader>
              <CardTitle className="text-base">
                {day.day_label}
                <span className="ml-2 text-xs font-normal text-slate-400">
                  Día {day.day_number}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {day.meals.map((meal, index) => (
                <div
                  key={`${meal.meal_slot}-${meal.title}-${index}`}
                  className="rounded-lg border border-slate-100 p-3"
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{meal.meal_slot}</Badge>
                    <span className="font-medium text-slate-800">{meal.title}</span>
                  </div>
                  <ul className="mb-2 space-y-1">
                    {meal.ingredients.map((ing, i) => (
                      <li key={`${ing.name}-${i}`}>
                        <span className="font-medium">{ing.name}</span>
                        {ing.portion ? ` — ${ing.portion}` : ""}
                        {ing.notes ? (
                          <span className="text-slate-500"> ({ing.notes})</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                  {meal.preparation && (
                    <p className="text-slate-700">{meal.preparation}</p>
                  )}
                  {meal.notes && (
                    <p className="mt-1 text-xs text-slate-500">{meal.notes}</p>
                  )}
                </div>
              ))}
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
