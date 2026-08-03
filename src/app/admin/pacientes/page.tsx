import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCurrentProfile } from "@/lib/auth/session";
import { ADMIN_NAV } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AdminPacientesPage() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") redirect("/login");

  const supabase = await createClient();
  const { data: patients } = await supabase
    .from("patients")
    .select("*, nutritionists(display_name)")
    .order("created_at", { ascending: false });

  return (
    <AppShell title="Pacientes" nav={ADMIN_NAV} currentPath="/admin/pacientes">
      <Card>
        <CardHeader><CardTitle className="text-base">Todos los pacientes</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {(patients ?? []).map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium">{p.full_name}</p>
                <p className="text-xs text-slate-500">{(p.nutritionists as { display_name?: string })?.display_name}</p>
              </div>
              <Badge variant={p.active ? "default" : "secondary"}>{p.precision_mode}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
      <Link href="/admin" className="text-sm text-emerald-700 underline">← Dashboard</Link>
    </AppShell>
  );
}
