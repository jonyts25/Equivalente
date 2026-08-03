import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { MenuCard } from "@/components/menus/MenuCard";
import { MenuActions } from "@/components/menus/MenuActions";
import { isMenuVisibleToPatient } from "@/lib/ai/contextual-draft";
import { requirePatientContext } from "@/lib/auth/patient-session";
import { PACIENTE_NAV } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";
import type { MenuStatus } from "@/types/database";

export default async function PacienteOpcionesPage() {
  const { patient } = await requirePatientContext();
  const supabase = await createClient();

  const { data: allMenus } = await supabase
    .from("generated_menus")
    .select("*")
    .eq("patient_id", patient.id)
    .in("status", ["approved", "pending_review", "favorite", "draft"])
    .order("created_at", { ascending: false });

  const menus = (allMenus ?? []).filter((menu) =>
    isMenuVisibleToPatient({
      status: menu.status as MenuStatus,
      content_json: menu.content_json as Record<string, unknown>,
    })
  );

  return (
    <AppShell title="Opciones" nav={PACIENTE_NAV} currentPath="/paciente/opciones">
      <Link href="/paciente/opciones/manual" className="block rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
        + Pedir más opciones (ChatGPT manual)
      </Link>
      <div className="space-y-3">
        {(menus ?? []).map((menu) => (
          <MenuCard key={menu.id} title={menu.title} status={menu.status}>
            <pre className="max-h-32 overflow-auto text-xs">{JSON.stringify(menu.content_json, null, 2)}</pre>
            <div className="mt-2"><MenuActions menuId={menu.id} role="patient" /></div>
          </MenuCard>
        ))}
      </div>
    </AppShell>
  );
}
