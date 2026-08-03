import { detectAmbiguity } from "../src/lib/nutrition/ambiguity-detector";

const cases: Array<{ input: string; expect: "requires_clarification" | "ok" }> = [
  { input: "mazapán de chocolate", expect: "requires_clarification" },
  { input: "un mazapán de chocolate", expect: "requires_clarification" },
  { input: "mazapán grande", expect: "requires_clarification" },
  { input: "una cucharada de crema de cacahuate", expect: "requires_clarification" },
  { input: "crema de cacahuate copeteada", expect: "requires_clarification" },
  { input: "poquito aceite", expect: "requires_clarification" },
  { input: "una tortillita", expect: "requires_clarification" },
  { input: "un vaso de jugo", expect: "requires_clarification" },
  { input: "un puñito de nueces", expect: "requires_clarification" },
];

let failed = 0;
for (const { input, expect } of cases) {
  const result = detectAmbiguity(input, "strict");
  const ok = result.status === expect;
  if (!ok) failed++;
  console.log(
    ok ? "PASS" : "FAIL",
    JSON.stringify({ input, expected: expect, got: result.status, questions: result.questions })
  );
}

const tone = detectAmbiguity("mazapán de chocolate", "strict").message.toLowerCase();
const badPhrases = ["está mal", "no deberías", "fallaste", "rompiste"];
const toneOk = !badPhrases.some((p) => tone.includes(p));
console.log(toneOk ? "PASS" : "FAIL", "tone check", tone);
if (!toneOk) failed++;

process.exit(failed > 0 ? 1 : 0);
