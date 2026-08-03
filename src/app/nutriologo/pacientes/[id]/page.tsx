import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentProfile } from "@/lib/auth/session";
import { NUTRIOLOGO_NAV } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";

const LINKS = (id: string) => [
  { href: `/nutriologo/pacientes/${id}/dieta`, label: "Dieta" },
  { href: `/nutriologo/pacientes/${id}/equivalencias`, label: "Equivalencias" },
  { href: `/nutriologo/pacientes/${id}/preferencias`, label: "Preferencias" },
  { href: `/nutriologo/pacientes/${id}/gustos-prohibidos`, label: "Gustos prohibidos" },
  { href: `/nutriologo/pacientes/${id}/menus`, label: "Menús" },
  { href: `/nutriologo/pacientes/${id}/seguimiento`, label: "Seguimiento" },
  { href: `/nutriologo/pacientes/${id}/historial`, label: "Historial" },
];

export default async function PacienteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  if (!profile || !["admin", "nutritionist"].includes(profile.role)) redirect("/login");

  const supabase = await createClient();
  const { data: patient } = await supabase.from("patients").select("*").eq("id", id).single();
  if (!patient) notFound();

  return (
    <AppShell title={patient.full_name} nav={NUTRIOLOGO_NAV} currentPath="/nutriologo/pacientes">
      <Card>
        <CardHeader><CardTitle className="text-base">Perfil del paciente</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><strong>Objetivo:</strong> {patient.goal ?? "—"}</p>
          <p><strong>Modo precisión:</strong> {patient.precision_mode}</p>
          <p><strong>Notas:</strong> {patient.notes ?? "—"}</p>
        </CardContent>
      </Card>
      <div className="grid gap-2">
        {LINKS(id).map((l) => (
          <Link key={l.href} href={l.href} className="rounded-lg border bg-white p-3 text-sm font-medium hover:bg-slate-50">
            {l.label} →
          </Link>
        ))}
      </div>
      <Link href="/nutriologo/pacientes" className="text-sm text-emerald-700 underline">← Pacientes</Link>
    </AppShell>
  );
}
