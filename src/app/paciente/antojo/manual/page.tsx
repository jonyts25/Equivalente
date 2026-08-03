import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MenuGenerator } from "@/components/menus/MenuGenerator";
import { requirePatientContext } from "@/lib/auth/patient-session";
import { getPatientPromptContext } from "@/lib/data/patient-context";
import { PACIENTE_NAV } from "@/lib/navigation";

export default async function PacienteAntojoManualPage() {
  const { patient } = await requirePatientContext();
  const ctx = await getPatientPromptContext(patient.id);

  return (
    <AppShell title="Antojo manual" nav={PACIENTE_NAV} currentPath="/paciente/antojo">
      <Card>
        <CardHeader><CardTitle className="text-base">Evaluar antojo con ChatGPT</CardTitle></CardHeader>
        <CardContent>
          <MenuGenerator
            patientId={patient.id}
            task="craving_check"
            title="Evaluación de antojo"
            defaultStatus="pending_review"
            context={{
              patientName: ctx.patientName,
              craving: "",
              dietSummary: ctx.dietSummary,
              restrictions: ctx.restrictions,
              forbiddenTreats: ctx.forbiddenTreats,
              triggerFoods: ctx.triggerFoods,
              precisionMode: ctx.precisionMode,
            }}
          />
        </CardContent>
      </Card>
      <Link href="/paciente/antojo" className="text-sm text-emerald-700 underline">← Antojo con detector</Link>
    </AppShell>
  );
}
