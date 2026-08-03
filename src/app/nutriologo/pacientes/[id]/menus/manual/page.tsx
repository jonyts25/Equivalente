import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ManualMenuGenerator } from "@/components/menus/ManualMenuGenerator";
import { getCurrentProfile } from "@/lib/auth/session";
import { getPatientPromptContext } from "@/lib/data/patient-context";
import { NUTRIOLOGO_NAV } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function PacienteMenusManualPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  if (!profile || !["admin", "nutritionist"].includes(profile.role)) redirect("/login");

  const supabase = await createClient();
  const { data: patient } = await supabase.from("patients").select("full_name").eq("id", id).single();
  if (!patient) notFound();

  const ctx = await getPatientPromptContext(id);

  return (
    <AppShell title="Generar menú manual" nav={NUTRIOLOGO_NAV} currentPath="/nutriologo/pacientes">
      <Card>
        <CardHeader><CardTitle className="text-base">Opciones equivalentes — ChatGPT manual</CardTitle></CardHeader>
        <CardContent>
          <ManualMenuGenerator
            patientId={id}
            task="generate_meal_options"
            title="Opciones de comida"
            context={{
              patientName: ctx.patientName,
              mealSlot: "Comida",
              dietSummary: ctx.dietSummary,
              equivalences: ctx.equivalences,
              restrictions: ctx.restrictions,
              preferences: ctx.preferences,
              forbiddenFoods: ctx.forbiddenFoods,
              triggerFoods: ctx.triggerFoods,
              forbiddenTreats: ctx.forbiddenTreats,
              precisionMode: ctx.precisionMode,
            }}
          />
        </CardContent>
      </Card>
      <Link href={`/nutriologo/pacientes/${id}/menus`} className="text-sm text-emerald-700 underline">← Menús</Link>
    </AppShell>
  );
}
