import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MenuGenerator } from "@/components/menus/MenuGenerator";
import { requirePatientContext } from "@/lib/auth/patient-session";
import { getPatientPromptContext } from "@/lib/data/patient-context";
import { PACIENTE_NAV } from "@/lib/navigation";

export default async function PacienteOpcionesManualPage() {
  const { patient } = await requirePatientContext();
  const ctx = await getPatientPromptContext(patient.id);

  return (
    <AppShell title="Pedir opciones" nav={PACIENTE_NAV} currentPath="/paciente/opciones">
      <Card>
        <CardHeader><CardTitle className="text-base">Generar opciones equivalentes</CardTitle></CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-slate-600">
            Las opciones que generes quedarán como <strong>pendiente de revisión</strong> por tu nutrióloga.
          </p>
          <MenuGenerator
            patientId={patient.id}
            task="generate_meal_options"
            title="Opciones solicitadas por paciente"
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
      <Link href="/paciente/opciones" className="text-sm text-emerald-700 underline">← Opciones</Link>
    </AppShell>
  );
}
