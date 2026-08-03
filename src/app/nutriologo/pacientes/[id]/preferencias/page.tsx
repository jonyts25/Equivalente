import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCurrentProfile } from "@/lib/auth/session";
import { NUTRIOLOGO_NAV } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function PacientePreferenciasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  if (!profile || !["admin", "nutritionist"].includes(profile.role)) redirect("/login");

  const supabase = await createClient();
  if (!(await supabase.from("patients").select("id").eq("id", id).single()).data) notFound();

  const { data: prefs } = await supabase
    .from("patient_food_preferences")
    .select("*")
    .eq("patient_id", id);

  return (
    <AppShell title="Preferencias" nav={NUTRIOLOGO_NAV} currentPath="/nutriologo/pacientes">
      <Card>
        <CardHeader><CardTitle className="text-base">Preferencias alimentarias</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {(prefs ?? []).map((p) => (
            <div key={p.id} className="flex justify-between rounded border p-2 text-sm">
              <span>{p.custom_food_name ?? p.food_item_id}</span>
              <Badge variant="outline">{p.preference}</Badge>
            </div>
          ))}
          {!prefs?.length && <p className="text-sm text-slate-500">Sin preferencias registradas.</p>}
        </CardContent>
      </Card>
      <Link href={`/nutriologo/pacientes/${id}`} className="text-sm text-emerald-700 underline">← Perfil</Link>
    </AppShell>
  );
}
