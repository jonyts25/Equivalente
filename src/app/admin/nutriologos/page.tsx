import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCurrentProfile } from "@/lib/auth/session";
import { ADMIN_NAV } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AdminNutriologosPage() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") redirect("/login");

  const supabase = await createClient();
  const { data: nutritionists } = await supabase
    .from("nutritionists")
    .select("*, profiles(full_name, role)")
    .order("created_at", { ascending: false });

  return (
    <AppShell title="Nutriólogos" nav={ADMIN_NAV} currentPath="/admin/nutriologos">
      <Card>
        <CardHeader><CardTitle className="text-base">Lista de nutriólogos</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {(nutritionists ?? []).map((n) => (
            <div key={n.id} className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium">{n.display_name}</p>
                <p className="text-xs text-slate-500">{(n.profiles as { full_name?: string })?.full_name}</p>
              </div>
              <Badge variant={n.active ? "default" : "secondary"}>{n.active ? "Activo" : "Inactivo"}</Badge>
            </div>
          ))}
          {!nutritionists?.length && <p className="text-sm text-slate-500">Sin nutriólogos. Créalos en Supabase Auth y vincula en nutritionists.</p>}
        </CardContent>
      </Card>
      <Link href="/admin" className="text-sm text-emerald-700 underline">← Dashboard</Link>
    </AppShell>
  );
}
