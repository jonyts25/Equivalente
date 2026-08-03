/**
 * Smoke test: Ollama health + equivalente API (server must be running).
 *
 * Usage:
 *   1. Ollama running (http://localhost:11434)
 *   2. npm run dev
 *   3. npm run test:ollama
 *
 * PowerShell UTF-8 (evita mojibake en consola):
 *   [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
 *   $OutputEncoding = [System.Text.Encoding]::UTF8
 *
 * Requires ENABLE_OLLAMA_DEV_API=true in .env.local (or admin session cookie).
 */
import { readFileSync } from "fs";
import { resolve } from "path";

function loadEnvLocal() {
  try {
    const content = readFileSync(resolve(__dirname, "../.env.local"), "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // optional
  }
}

loadEnvLocal();

const BASE = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

const PROMPTS: Array<{
  id: string;
  texto: string;
  expectReview: boolean;
  maxConfidence: number;
  intenciones: string[];
  noScolding?: boolean;
  noExactGrams?: boolean;
  noCompensation?: boolean;
  detectFood?: string;
  expectFlags?: string[];
}> = [
  {
    id: "caso-1-sustitucion",
    texto: "¿Puedo cambiar 2 tortillas por arroz?",
    expectReview: true,
    maxConfidence: 0.65,
    intenciones: ["sustitucion_alimento"],
    expectFlags: ["requires_professional_review", "missing_equivalence_table"],
  },
  {
    id: "caso-2-equivalencia",
    texto: "¿Cuánto arroz equivale a una tortilla?",
    expectReview: true,
    maxConfidence: 0.65,
    intenciones: ["duda_porcion", "sustitucion_alimento"],
    noExactGrams: true,
  },
  {
    id: "caso-3-antojo",
    texto: "Tengo antojo de mazapán",
    expectReview: true,
    maxConfidence: 0.65,
    intenciones: ["antojo"],
    noScolding: true,
    detectFood: "mazap",
  },
  {
    id: "caso-4-ingredientes",
    texto: "Solo tengo pollo, huevo y aguacate, ¿qué puedo cenar?",
    expectReview: true,
    maxConfidence: 0.65,
    intenciones: ["ingrediente_disponible", "sustitucion_alimento", "otro"],
    noExactGrams: true,
  },
  {
    id: "caso-5-desviacion",
    texto: "Me comí algo fuera de la dieta, ¿qué hago?",
    expectReview: true,
    maxConfidence: 0.65,
    intenciones: ["otro", "duda_porcion", "antojo"],
    noScolding: true,
    noCompensation: true,
  },
];

const PERMISSIVE = [/claro que s[ií]/i, /sin problema/i, /puedes cambiar/i];
const SCOLDING = [/prohibido/i, /no debes/i, /est[aá]\s+mal/i, /castigo/i, /bloqueo/i, /rega[ñn]/i, /culpa/i];
const COMPENSATION = [/ayuno/i, /compens/i, /castig/i, /no comas/i, /saltarte/i];

let failed = 0;

function pass(msg: string) {
  console.log("PASS", msg);
}

function fail(msg: string, detail?: string) {
  failed++;
  console.log("FAIL", msg, detail ?? "");
}

type ApiPayload = {
  ok: boolean;
  intencion?: string;
  alimentos_detectados?: string[];
  respuesta_paciente?: string;
  requiere_revision_nutriologa?: boolean;
  confianza?: number;
  flags?: string[];
  error?: string;
};

async function main() {
  console.log(`Base URL: ${BASE}`);
  console.log(`ENABLE_OLLAMA_DEV_API: ${process.env.ENABLE_OLLAMA_DEV_API ?? "(not set)"}\n`);

  try {
    const res = await fetch(`${BASE}/api/ai/health`);
    const charset = res.headers.get("content-type") ?? "";
    if (!charset.includes("charset=utf-8")) fail("health content-type", charset);
    else pass("health Content-Type charset=utf-8");

    const data = (await res.json()) as ApiPayload & { models?: string[] };
    if (data.ok && Array.isArray(data.models)) pass(`health — ${data.models.length} modelos`);
    else fail("health", data.error ?? JSON.stringify(data));
  } catch (e) {
    fail("health fetch", e instanceof Error ? e.message : String(e));
    console.log("\n¿Está corriendo npm run dev?");
    process.exit(1);
  }

  for (const caseDef of PROMPTS) {
    const label = caseDef.id;
    try {
      const res = await fetch(`${BASE}/api/ai/equivalente`, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ texto: caseDef.texto }),
      });

      const charset = res.headers.get("content-type") ?? "";
      if (!charset.includes("charset=utf-8")) fail(`charset — ${label}`, charset);

      const data = (await res.json()) as ApiPayload;
      if (data.ok !== true || !data.intencion || !data.respuesta_paciente) {
        fail(`${label}`, JSON.stringify(data).slice(0, 200));
        continue;
      }

      pass(`${label} → ${data.intencion} (conf=${data.confianza}, flags=${data.flags?.length ?? 0})`);

      if (caseDef.expectReview && data.requiere_revision_nutriologa !== true) {
        fail(`review required — ${label}`, String(data.requiere_revision_nutriologa));
      }

      if ((data.confianza ?? 1) > caseDef.maxConfidence) {
        fail(`confidence cap — ${label}`, `confianza=${data.confianza}`);
      }

      if (!caseDef.intenciones.includes(data.intencion)) {
        fail(`intencion — ${label}`, `got ${data.intencion}`);
      }

      if (!Array.isArray(data.alimentos_detectados)) {
        fail(`alimentos array — ${label}`);
      }

      if (caseDef.detectFood) {
        const foods = (data.alimentos_detectados ?? []).join(" ").toLowerCase();
        if (!foods.includes(caseDef.detectFood)) {
          fail(`detect food — ${label}`, foods);
        }
      }

      if (caseDef.expectFlags) {
        for (const flag of caseDef.expectFlags) {
          if (!data.flags?.includes(flag)) fail(`flag ${flag} — ${label}`, JSON.stringify(data.flags));
        }
      }

      if (data.requiere_revision_nutriologa) {
        for (const pattern of PERMISSIVE) {
          if (pattern.test(data.respuesta_paciente ?? "")) {
            fail(`no permissive — ${label}`, data.respuesta_paciente?.slice(0, 80));
            break;
          }
        }
      }

      if (caseDef.noScolding) {
        for (const pattern of SCOLDING) {
          if (pattern.test(data.respuesta_paciente ?? "")) {
            fail(`no scolding — ${label}`, data.respuesta_paciente?.slice(0, 80));
            break;
          }
        }
      }

      if (caseDef.noExactGrams) {
        if (/\b\d+\s*(g|gr|gramos?)\b/i.test(data.respuesta_paciente ?? "")) {
          fail(`no exact grams — ${label}`, data.respuesta_paciente?.slice(0, 80));
        }
      }

      if (caseDef.noCompensation) {
        for (const pattern of COMPENSATION) {
          if (pattern.test(data.respuesta_paciente ?? "")) {
            fail(`no compensation — ${label}`, data.respuesta_paciente?.slice(0, 80));
            break;
          }
        }
      }
    } catch (e) {
      fail(`${label}`, e instanceof Error ? e.message : String(e));
    }
  }

  console.log(`\nSmoke test complete. Failures: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
