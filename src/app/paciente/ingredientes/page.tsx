import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ManualMenuGenerator } from "@/components/menus/ManualMenuGenerator";
import { requirePatientContext } from "@/lib/auth/patient-session";
import { getPatientPromptContext } from "@/lib/data/patient-context";
import { PACIENTE_NAV } from "@/lib/navigation";

export default async function PacienteIngredientesPage() {
  const { patient } = await requirePatientContext();
  const ctx = await getPatientPromptContext(patient.id);

  return (
    <AppShell title="Tengo estos ingredientes" nav={PACIENTE_NAV} currentPath="/paciente/ingredientes">
      <Card>
        <CardHeader><CardTitle className="text-base">Menú con ingredientes disponibles</CardTitle></CardHeader>
        <CardContent>
          <ManualMenuGenerator
            patientId={patient.id}
            task="ingredients_menu"
            title="Menú con ingredientes"
            defaultStatus="pending_review"
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
      <Link href="/paciente" className="text-sm text-emerald-700 underline">← Inicio</Link>
    </AppShell>
  );
}
