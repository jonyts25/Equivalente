import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CravingChecker } from "@/components/patient/CravingChecker";
import { requirePatientContext } from "@/lib/auth/patient-session";
import { getPatientPromptContext } from "@/lib/data/patient-context";
import { PACIENTE_NAV } from "@/lib/navigation";

export default async function PacienteAntojoPage() {
  const { patient } = await requirePatientContext();
  const ctx = await getPatientPromptContext(patient.id);

  return (
    <AppShell title="Tengo antojo" nav={PACIENTE_NAV} currentPath="/paciente/antojo">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">No me dejes hacerme trampa</CardTitle>
        </CardHeader>
        <CardContent>
          <CravingChecker
            patientId={patient.id}
            patientName={ctx.patientName}
            precisionMode={patient.precision_mode}
            promptContext={{
              dietSummary: ctx.dietSummary,
              restrictions: ctx.restrictions,
              forbiddenTreats: ctx.forbiddenTreats,
              triggerFoods: ctx.triggerFoods,
            }}
          />
        </CardContent>
      </Card>
      <Link href="/paciente/antojo/manual" className="text-sm text-slate-500 underline">Flujo manual directo →</Link>
      <Link href="/paciente" className="block text-sm text-emerald-700 underline">← Inicio</Link>
    </AppShell>
  );
}
