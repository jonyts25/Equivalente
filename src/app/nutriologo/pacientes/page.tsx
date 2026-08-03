import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCurrentProfile } from "@/lib/auth/session";
import { getNutritionistByProfileId } from "@/lib/data/patient-context";
import { NUTRIOLOGO_NAV } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function NutriologoPacientesPage() {
  const profile = await getCurrentProfile();
  if (!profile || !["admin", "nutritionist"].includes(profile.role)) redirect("/login");

  const supabase = await createClient();
  const nutritionist = await getNutritionistByProfileId(profile.id);

  let patients: Array<{ id: string; full_name: string; precision_mode: string; active: boolean }> = [];
  if (nutritionist) {
    const { data } = await supabase
      .from("patients")
      .select("id, full_name, precision_mode, active")
      .eq("nutritionist_id", nutritionist.id)
      .order("full_name");
    patients = data ?? [];
  }

  return (
    <AppShell title="Pacientes" nav={NUTRIOLOGO_NAV} currentPath="/nutriologo/pacientes">
      <Card>
        <CardHeader><CardTitle className="text-base">Pacientes asignados</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {patients.map((p) => (
            <Link key={p.id} href={`/nutriologo/pacientes/${p.id}`} className="block rounded-lg border p-3 hover:bg-slate-50">
              <div className="flex justify-between">
                <span className="font-medium">{p.full_name}</span>
                <Badge variant="outline">{p.precision_mode}</Badge>
              </div>
            </Link>
          ))}
          {!patients.length && <p className="text-sm text-slate-500">Sin pacientes asignados.</p>}
        </CardContent>
      </Card>
    </AppShell>
  );
}
