import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentProfile } from "@/lib/auth/session";
import { ADMIN_NAV } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AdminEquivalenciasPage() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") redirect("/login");

  const supabase = await createClient();
  const { data: groups } = await supabase.from("equivalence_groups").select("*").order("name");

  return (
    <AppShell title="Equivalencias" nav={ADMIN_NAV} currentPath="/admin/equivalencias">
      <Card>
        <CardHeader><CardTitle className="text-base">Grupos de equivalencia</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {(groups ?? []).map((g) => (
            <div key={g.id} className="rounded border p-2 text-sm">
              <p className="font-medium">{g.name}</p>
              <p className="text-xs text-slate-500">{g.category}</p>
            </div>
          ))}
        </CardContent>
      </Card>
      <Link href="/admin" className="text-sm text-emerald-700 underline">← Dashboard</Link>
    </AppShell>
  );
}
