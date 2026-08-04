import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MenuCard } from "@/components/menus/MenuCard";
import { requirePatientContext } from "@/lib/auth/patient-session";
import { PACIENTE_NAV } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";
import type { MenuStatus } from "@/types/database";

type ShoppingLine = {
  name: string;
  portions: string[];
  fromMenus: string[];
};

/** Suma ingredientes de menús aprobados y agrupa por nombre (sin IA). */
function aggregateIngredientsFromApprovedMenus(
  menus: Array<{ title: string; content_json: unknown }>
): ShoppingLine[] {
  const byName = new Map<string, ShoppingLine>();

  function addIngredient(name: string, portion: string | undefined, menuTitle: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase();
    const existing = byName.get(key) ?? { name: trimmed, portions: [], fromMenus: [] };
    if (portion?.trim()) existing.portions.push(portion.trim());
    if (!existing.fromMenus.includes(menuTitle)) existing.fromMenus.push(menuTitle);
    byName.set(key, existing);
  }

  function walkIngredients(value: unknown, menuTitle: string) {
    if (!value || typeof value !== "object") return;

    if (Array.isArray(value)) {
      for (const item of value) walkIngredients(item, menuTitle);
      return;
    }

    const obj = value as Record<string, unknown>;

    if (Array.isArray(obj.ingredients)) {
      for (const ing of obj.ingredients) {
        if (!ing || typeof ing !== "object") continue;
        const row = ing as Record<string, unknown>;
        if (typeof row.name === "string") {
          addIngredient(
            row.name,
            typeof row.portion === "string" ? row.portion : undefined,
            menuTitle
          );
        }
      }
    }

    if (Array.isArray(obj.items)) {
      for (const item of obj.items) {
        if (!item || typeof item !== "object") continue;
        const row = item as Record<string, unknown>;
        if (typeof row.name === "string") {
          addIngredient(
            row.name,
            typeof row.quantity === "string" ? row.quantity : undefined,
            menuTitle
          );
        }
      }
    }

    if (Array.isArray(obj.options)) {
      for (const option of obj.options) walkIngredients(option, menuTitle);
    }
  }

  for (const menu of menus) {
    walkIngredients(menu.content_json, menu.title);
  }

  return Array.from(byName.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "es", { sensitivity: "base" })
  );
}

export default async function PacienteSuperPage() {
  const { patient } = await requirePatientContext();
  const supabase = await createClient();

  const { data: menus } = await supabase
    .from("generated_menus")
    .select("id, title, status, explanation, content_json")
    .eq("patient_id", patient.id)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  const approved = menus ?? [];
  const shoppingList = aggregateIngredientsFromApprovedMenus(approved);

  return (
    <AppShell title="Lista de súper" nav={PACIENTE_NAV} currentPath="/paciente/super">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lista de súper (menús aprobados)</CardTitle>
        </CardHeader>
        <CardContent>
          {shoppingList.length === 0 ? (
            <p className="text-sm text-slate-500">
              No hay ingredientes que sumar todavía. Cuando tu nutrióloga apruebe menús, aquí
              aparecerán agrupados por nombre.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {shoppingList.map((line) => (
                <li key={line.name} className="rounded-md border border-slate-100 px-3 py-2">
                  <div className="font-medium text-slate-800">{line.name}</div>
                  {line.portions.length > 0 && (
                    <div className="text-slate-600">{line.portions.join(" · ")}</div>
                  )}
                  <div className="text-xs text-slate-400">
                    De: {line.fromMenus.join(", ")}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-sm font-medium text-slate-800">Menús aprobados</h2>
        {approved.length === 0 ? (
          <p className="text-sm text-slate-500">Aún no hay menús aprobados.</p>
        ) : (
          approved.map((menu) => (
            <MenuCard
              key={menu.id}
              title={menu.title}
              status={menu.status as MenuStatus}
              explanation={menu.explanation}
            >
              <pre className="max-h-32 overflow-auto text-xs">
                {JSON.stringify(menu.content_json, null, 2)}
              </pre>
            </MenuCard>
          ))
        )}
      </div>

      <Link href="/paciente" className="text-sm text-emerald-700 underline">
        ← Inicio
      </Link>
    </AppShell>
  );
}
