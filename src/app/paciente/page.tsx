import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { DisclaimerBanner } from "@/components/layout/DisclaimerBanner";
import { LogoutButton } from "@/components/layout/LogoutButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePatientContext } from "@/lib/auth/patient-session";
import { PACIENTE_NAV } from "@/lib/navigation";

export default async function PacienteDashboard() {
  const { profile, patient } = await requirePatientContext();

  return (
    <AppShell title="Paciente" subtitle={profile.full_name ?? patient.full_name} nav={PACIENTE_NAV} currentPath="/paciente">
      <DisclaimerBanner />
      <div className="flex justify-end"><LogoutButton /></div>
      <Card>
        <CardHeader><CardTitle className="text-base">Bienvenido/a, {patient.full_name}</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>Modo precisión: <strong>{patient.precision_mode}</strong> (No me dejes hacerme trampa)</p>
          <Link href="/paciente/hoy" className="block rounded-lg bg-emerald-600 p-3 text-center text-white">
            Ver comidas de hoy →
          </Link>
        </CardContent>
      </Card>
    </AppShell>
  );
}
