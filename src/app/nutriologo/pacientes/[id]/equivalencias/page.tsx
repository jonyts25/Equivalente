import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EquivalenceForm } from "@/components/nutritionist/EquivalenceForm";
import { getCurrentProfile } from "@/lib/auth/session";
import { NUTRIOLOGO_NAV } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";

type EquivalenceItemRow = {
  portion_label: string;
  grams: number | null;
  units: number | null;
  notes: string | null;
  food_items: { name: string } | { name: string }[] | null;
};

type EquivalenceGroupRow = {
  id: string;
  name: string;
  category: string;
  notes: string | null;
  equivalence_items: EquivalenceItemRow[] | null;
};

function foodNameFromItem(item: EquivalenceItemRow): string {
  const food = item.food_items;
  if (!food) return "Alimento";
  if (Array.isArray(food)) return food[0]?.name ?? "Alimento";
  return food.name;
}

function isDemoGroup(name: string, notes: string | null): boolean {
  return /demo/i.test(name) || /demo/i.test(notes ?? "");
}

export default async function PacienteEquivalenciasPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  if (!profile || !["admin", "nutritionist"].includes(profile.role)) redirect("/login");

  const supabase = await createClient();
  const { data: patient } = await supabase.from("patients").select("full_name").eq("id", id).single();
  if (!patient) notFound();

  const { data: groups } = await supabase
    .from("equivalence_groups")
    .select("id, name, category, notes, equivalence_items(portion_label, grams, units, notes, food_items(name))")
    .eq("patient_id", id)
    .eq("active", true)
    .order("name");

  const groupList = (groups ?? []) as unknown as EquivalenceGroupRow[];
  const hasEquivalences = groupList.some((g) => (g.equivalence_items?.length ?? 0) > 0);

  return (
    <AppShell title="Equivalencias" nav={NUTRIOLOGO_NAV} currentPath="/nutriologo/pacientes">
      {!hasEquivalences && (
        <Card className="mb-4 border-amber-200 bg-amber-50">
          <CardContent className="pt-4 text-sm text-amber-900">
            Sin equivalencias cargadas. Las sustituciones requerirán revisión de nutrióloga.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Grupos de equivalencia</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {groupList.length === 0 && (
            <p className="text-sm text-slate-600">Aún no hay grupos. Usa el formulario abajo para agregar uno.</p>
          )}
          {groupList.map((g) => {
            const demo = isDemoGroup(g.name, g.notes);
            return (
              <div key={g.id} className="rounded border p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{g.name} ({g.category})</p>
                  {demo && <Badge className="bg-amber-100 text-amber-900">Demo</Badge>}
                </div>
                {g.notes && <p className="mt-1 text-xs text-slate-500">{g.notes}</p>}
                <ul className="mt-2 space-y-1 text-xs text-slate-600">
                  {(g.equivalence_items ?? []).map((item, i) => (
                    <li key={i} className="list-inside list-disc">
                      {foodNameFromItem(item)} — {item.portion_label}
                      {item.grams != null && ` (${item.grams} g)`}
                      {item.notes && <span className="text-slate-400"> · {item.notes}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Nuevo grupo</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-xs text-slate-500">
            Crea el grupo aquí; los ítems se agregan desde el catálogo o con soporte clínico posterior.
          </p>
          <EquivalenceForm patientId={id} />
        </CardContent>
      </Card>

      <Link href={`/nutriologo/pacientes/${id}`} className="mt-4 inline-block text-sm text-emerald-700 underline">
        ← Perfil
      </Link>
    </AppShell>
  );
}
