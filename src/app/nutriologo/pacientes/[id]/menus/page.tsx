import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { IaDraftMenuCard } from "@/components/menus/IaDraftMenuCard";
import { MenuCard } from "@/components/menus/MenuCard";
import { MenuActions } from "@/components/menus/MenuActions";
import { MenuGenerator } from "@/components/menus/MenuGenerator";
import { isIaLocalContextualDraft } from "@/lib/ai/contextual-draft";
import { getCurrentProfile } from "@/lib/auth/session";
import { getPatientPromptContext } from "@/lib/data/patient-context";
import { NUTRIOLOGO_NAV } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";
import type { MenuStatus } from "@/types/database";

export default async function PacienteMenusPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { id } = await params;
  const { status: filterStatus } = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile || !["admin", "nutritionist"].includes(profile.role)) redirect("/login");

  const supabase = await createClient();
  if (!(await supabase.from("patients").select("id").eq("id", id).single()).data) notFound();

  const ctx = await getPatientPromptContext(id);

  let query = supabase
    .from("generated_menus")
    .select("*, meal_slots(name)")
    .eq("patient_id", id)
    .order("created_at", { ascending: false });

  if (filterStatus) {
    query = query.eq("status", filterStatus);
  }

  const { data: menus } = await query;
  const role = profile.role === "admin" ? "admin" : "nutritionist";

  const filters: MenuStatus[] = [
    "draft",
    "pending_review",
    "approved",
    "rejected",
    "requires_clarification",
    "favorite",
  ];

  return (
    <AppShell title="Menús generados" nav={NUTRIOLOGO_NAV} currentPath="/nutriologo/pacientes">
      <div className="flex flex-wrap gap-2">
        <Link href={`/nutriologo/pacientes/${id}/menus`} className="rounded-full bg-slate-100 px-3 py-1 text-xs">
          Todos
        </Link>
        {filters.map((f) => (
          <Link key={f} href={`/nutriologo/pacientes/${id}/menus?status=${f}`} className="rounded-full bg-slate-100 px-3 py-1 text-xs">
            {f}
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Generar opciones equivalentes</CardTitle>
        </CardHeader>
        <CardContent>
          <MenuGenerator
            patientId={id}
            task="generate_meal_options"
            title="Opciones equivalentes"
            defaultStatus="draft"
            context={{
              patientName: ctx.patientName,
              mealSlot: "Comida",
              dietSummary: ctx.dietSummary,
              equivalences: ctx.equivalences,
              restrictions: ctx.restrictions,
              preferences: ctx.preferences,
              forbiddenFoods: ctx.forbiddenFoods,
              triggerFoods: ctx.triggerFoods,
              forbiddenTreats: ctx.forbiddenTreats,
              precisionMode: ctx.precisionMode,
            }}
          />
        </CardContent>
      </Card>

      <Link
        href={`/nutriologo/pacientes/${id}/menus/manual`}
        className="block rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800"
      >
        + Generar menú (modo manual ChatGPT)
      </Link>
      <Link
        href="/nutriologo/ia-local"
        className="block rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700"
      >
        Probar IA local contextual y guardar borradores →
      </Link>

      <div className="space-y-3">
        {(menus ?? []).map((menu) => {
          const content = menu.content_json as Record<string, unknown>;
          if (isIaLocalContextualDraft(content)) {
            return (
              <IaDraftMenuCard
                key={menu.id}
                menu={{
                  ...menu,
                  content_json: content,
                  meal_slots: menu.meal_slots as { name: string } | { name: string }[] | null,
                }}
                patientId={id}
                role={role}
              />
            );
          }
          return (
            <MenuCard key={menu.id} title={menu.title} status={menu.status} explanation={menu.explanation}>
              <pre className="max-h-32 overflow-auto text-xs">{JSON.stringify(menu.content_json, null, 2)}</pre>
              <div className="mt-3">
                <MenuActions menuId={menu.id} role={role} patientId={id} />
              </div>
            </MenuCard>
          );
        })}
      </div>

      <Link href={`/nutriologo/pacientes/${id}`} className="text-sm text-emerald-700 underline">
        ← Perfil
      </Link>
    </AppShell>
  );
}
