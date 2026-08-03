import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCurrentProfile } from "@/lib/auth/session";
import { ADMIN_NAV } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AdminCatalogoAlimentosPage() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") redirect("/login");

  const supabase = await createClient();
  const { data: foods } = await supabase.from("food_items").select("*").order("category").order("name");

  return (
    <AppShell title="Catálogo alimentos" nav={ADMIN_NAV} currentPath="/admin/catalogo-alimentos">
      <Card>
        <CardHeader><CardTitle className="text-base">Alimentos globales</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {(foods ?? []).map((f) => (
            <div key={f.id} className="flex justify-between rounded border p-2 text-sm">
              <span>{f.name}</span>
              <Badge variant="outline">{f.category}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
      <Link href="/admin" className="text-sm text-emerald-700 underline">← Dashboard</Link>
    </AppShell>
  );
}
