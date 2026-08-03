/**
 * CLI: import nutrition progress from Excel into Supabase.
 * Usage:
 *   npm run import:progress -- --patientId=UUID --file=./plantilla.xlsx
 *   npm run import:progress -- --patientId=UUID --file=./plantilla.xlsx --dry-run
 *   npm run import:progress -- --patientId=UUID --file=./plantilla.xlsx --duplicate-mode=skip
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";
import { parseProgressWorkbook } from "../src/lib/progress/excel-parser";
import {
  checkinDuplicateKey,
  countImportDuplicates,
  type ImportDuplicateMode,
} from "../src/lib/progress/import-service";
import { applyProgressImportToDb } from "../src/lib/progress/import-db";

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

function arg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : undefined;
}

loadEnvLocal();

const patientId = arg("patientId");
const filePath = arg("file");
const dryRun = process.argv.includes("--dry-run");
const duplicateMode = (arg("duplicate-mode") ?? "skip") as ImportDuplicateMode;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const password = process.env.DEMO_PASSWORD ?? "Equivalente2026!";

if (!patientId || !filePath) {
  console.error("Usage: npm run import:progress -- --patientId=UUID --file=./plantilla.xlsx [--dry-run] [--duplicate-mode=skip|update|import_anyway]");
  process.exit(1);
}

const resolvedPatientId = patientId;
const resolvedFilePath = filePath;

if (!url || (!serviceKey && !anon)) {
  console.error("Missing Supabase env (NEXT_PUBLIC_SUPABASE_URL and key)");
  process.exit(1);
}

async function main() {
  const absFile = resolve(process.cwd(), resolvedFilePath);
  const buffer = readFileSync(absFile);
  const parsed = parseProgressWorkbook(buffer);

  console.log("\n=== Preview ===");
  console.log("Baseline:", parsed.baseline ? "yes" : "no");
  console.log("Check-ins:", parsed.checkins.length);
  console.log("Composition:", parsed.bodyComposition.length);
  console.log("Adherence notes:", parsed.adherenceNotes.length);
  console.log("Warnings:", parsed.warnings.length);
  console.log("Errors:", parsed.errors.length);
  parsed.warnings.slice(0, 10).forEach((w) => console.log("  warn:", w));
  parsed.errors.forEach((e) => console.log("  error:", e));

  if (parsed.errors.length > 0) {
    process.exit(1);
  }

  const supabase = createClient(url!, serviceKey ?? anon!);
  let profileId = "cli-import";

  if (!serviceKey) {
    const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
      email: "nutriologo@equivalente.local",
      password,
    });
    if (authErr || !auth.user) {
      console.error("Auth failed (set SUPABASE_SERVICE_ROLE_KEY or use demo nutriologo):", authErr?.message);
      process.exit(1);
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", auth.user.id)
      .single();
    profileId = profile?.id ?? auth.user.id;
  }

  const { data: existingCheckins } = await supabase
    .from("nutrition_checkins")
    .select("checkin_date, weight_kg")
    .eq("patient_id", resolvedPatientId)
    .eq("is_deleted", false);

  const dupes = countImportDuplicates(parsed, {
    checkinKeys: new Set((existingCheckins ?? []).map((c) => checkinDuplicateKey(c.checkin_date, c.weight_kg))),
    compositionKeys: new Set(),
    adherenceKeys: new Set(),
  });
  console.log("Duplicate check-ins vs DB:", dupes.duplicateCheckins);

  if (dryRun) {
    console.log("\nDry run — no data written.");
    process.exit(0);
  }

  const stats = await applyProgressImportToDb(supabase, {
    patientId: resolvedPatientId,
    parsed,
    duplicateMode,
    fileName: resolvedFilePath.split(/[/\\]/).pop() ?? resolvedFilePath,
    profileId,
  });

  console.log("\n=== Import complete ===");
  console.log(JSON.stringify(stats, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
