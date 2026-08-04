import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { CreatePatientForm } from "@/components/nutritionist/CreatePatientForm";
import { getCurrentProfile } from "@/lib/auth/session";
import { NUTRIOLOGO_NAV } from "@/lib/navigation";

export default async function NuevoPacientePage() {
  const profile = await getCurrentProfile();
  if (!profile || !["admin", "nutritionist"].includes(profile.role)) {
    redirect("/login");
  }

  return (
    <AppShell title="Nuevo paciente" nav={NUTRIOLOGO_NAV} currentPath="/nutriologo/pacientes">
      <p className="text-sm text-slate-600">
        Crea el acceso (login) y el registro clínico del paciente en un solo paso.
      </p>
      <CreatePatientForm />
      <Link href="/nutriologo/pacientes" className="text-sm text-emerald-700 underline">
        ← Pacientes
      </Link>
    </AppShell>
  );
}
