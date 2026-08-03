/**
 * QA: Supabase auth + RLS smoke test (requires demo users in Supabase Auth)
 * Usage: DEMO_PASSWORD=Equivalente2026! npx tsx scripts/qa-supabase-e2e.ts
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

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
    // .env.local optional when env is already set
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const password = process.env.DEMO_PASSWORD ?? "Equivalente2026!";

if (!url || !anon) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}

const SAMPLE_MENU_JSON = JSON.stringify({
  status: "ok",
  options: [
    {
      title: "QA Test Opción",
      meal_slot: "Comida",
      ingredients: [{ name: "pollo", portion: "100g", notes: "" }],
      preparation: "A la plancha",
      replaces: "Comida base",
      equivalences: [
        {
          group: "protein",
          base: "pollo",
          replacement: "pollo",
          explanation: "Misma proteína",
        },
      ],
      warnings: [],
      requires_review: true,
      confidence: "high",
    },
  ],
});

let failed = 0;

function pass(msg: string) {
  console.log("PASS", msg);
}

function fail(msg: string, detail?: string) {
  failed++;
  console.log("FAIL", msg, detail ?? "");
}

async function signIn(email: string) {
  const client = createClient(url!, anon!);
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) return { client, error: error.message, user: null as null };
  return { client, error: null, user: data.user };
}

async function main() {
  // Admin login
  const admin = await signIn("admin@equivalente.local");
  if (admin.error) {
    fail("admin login", admin.error);
    console.log("\nCannot continue E2E without auth. Set DEMO_PASSWORD if different.");
    process.exit(1);
  }
  pass("admin login");

  const { data: allPatients } = await admin.client.from("patients").select("id, full_name");
  pass(`admin sees ${allPatients?.length ?? 0} patients`);

  const { data: plans } = await admin.client.from("subscription_plans").select("name");
  pass(`admin/subscription_plans readable: ${plans?.length ?? 0} plans`);

  // Nutritionist
  const nutri = await signIn("nutriologo@equivalente.local");
  if (nutri.error) fail("nutritionist login", nutri.error);
  else {
    pass("nutritionist login");
    const { data: myPatients } = await nutri.client.from("patients").select("id, full_name");
    pass(`nutritionist sees ${myPatients?.length ?? 0} assigned patients`);

    const patientId = myPatients?.[0]?.id;
    if (patientId) {
      const { error: menuErr } = await nutri.client.from("generated_menus").insert({
        patient_id: patientId,
        generation_type: "meal_options",
        title: "QA Nutri Menu Draft",
        content_json: JSON.parse(SAMPLE_MENU_JSON),
        status: "draft",
        created_by: nutri.user!.id,
      });
      if (menuErr) fail("nutritionist insert menu", menuErr.message);
      else pass("nutritionist insert generated_menu draft");
    }
  }

  // Patient
  const patient = await signIn("paciente@equivalente.local");
  if (patient.error) fail("patient login", patient.error);
  else {
    pass("patient login");

    const { data: ownPatient } = await patient.client
      .from("patients")
      .select("id")
      .maybeSingle();
    const patientId = ownPatient?.id;
    if (!patientId) fail("patient has patient row");
    else {
      pass("patient sees own patient row");

      const { data: otherPatients } = await patient.client.from("patients").select("id");
      if ((otherPatients?.length ?? 0) > 1) fail("patient sees other patients", String(otherPatients?.length));
      else pass("patient cannot see other patients");

      const { data: diet } = await patient.client
        .from("diet_plans")
        .select("title, meal_slots(name)")
        .eq("status", "active")
        .maybeSingle();
      if (diet) pass(`patient sees active diet: ${diet.title}`);
      else fail("patient missing active diet");

      // Insert pending menu via manual flow simulation
      const { data: session, error: sessErr } = await patient.client
        .from("manual_ai_sessions")
        .insert({
          patient_id: patientId,
          user_id: patient.user!.id,
          task_type: "generate_meal_options",
          prompt_text: "QA prompt",
          pasted_response: SAMPLE_MENU_JSON,
          parsed_json: JSON.parse(SAMPLE_MENU_JSON),
          validation_status: "saved",
        })
        .select("id")
        .single();
      if (sessErr) fail("patient insert manual_ai_session", sessErr.message);
      else pass("patient insert manual_ai_session");

      const { data: menu, error: menuErr } = await patient.client
        .from("generated_menus")
        .insert({
          patient_id: patientId,
          generation_type: "meal_options",
          title: "QA Patient Pending Menu",
          content_json: JSON.parse(SAMPLE_MENU_JSON),
          status: "pending_review",
          created_by: patient.user!.id,
        })
        .select("id, status")
        .single();
      if (menuErr) fail("patient insert pending menu", menuErr.message);
      else {
        pass(`patient menu status: ${menu.status}`);

        // Patient cannot approve
        const { error: approveErr } = await patient.client
          .from("generated_menus")
          .update({ status: "approved", reviewed_by: patient.user!.id })
          .eq("id", menu.id);
        if (approveErr) pass("patient blocked from approving (RLS or no row)");
        else {
          const { data: check } = await patient.client
            .from("generated_menus")
            .select("status")
            .eq("id", menu.id)
            .single();
          if (check?.status === "approved") fail("patient was able to approve menu");
          else pass("patient approve did not persist");
        }
      }

      // Patient feedback
      const { error: fbErr } = await patient.client.from("patient_feedback").insert({
        patient_id: patientId,
        feedback_type: "liked",
        comment: "QA feedback",
      });
      if (fbErr) fail("patient insert feedback", fbErr.message);
      else pass("patient insert feedback");

      // Credit balances isolation
      const { data: credits } = await patient.client.from("ai_credit_balances").select("patient_id");
      const leaked = credits?.some((c) => c.patient_id && c.patient_id !== patientId);
      if (leaked) fail("patient sees other credit balances");
      else pass("patient credit balances isolated or empty");

      void session;
    }
  }

  // Nutritionist approve patient's menu
  if (nutri.user && patient.user) {
    const { data: pendingMenus } = await nutri.client
      .from("generated_menus")
      .select("id, status, title")
      .eq("status", "pending_review")
      .order("created_at", { ascending: false })
      .limit(1);
    const menuId = pendingMenus?.[0]?.id;
    if (menuId) {
      const { error } = await nutri.client
        .from("generated_menus")
        .update({
          status: "approved",
          reviewed_by: nutri.user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", menuId);
      if (error) fail("nutritionist approve menu", error.message);
      else pass("nutritionist approve pending menu");
    } else {
      console.log("SKIP nutritionist approve (no pending menu)");
    }
  }

  console.log(`\nE2E complete. Failures: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
