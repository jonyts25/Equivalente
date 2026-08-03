import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { MenuCard } from "@/components/menus/MenuCard";
import { requirePatientContext } from "@/lib/auth/patient-session";
import { PACIENTE_NAV } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function PacienteFavoritosPage() {
  const { patient } = await requirePatientContext();
  const supabase = await createClient();

  const { data: menus } = await supabase
    .from("generated_menus")
    .select("*")
    .eq("patient_id", patient.id)
    .eq("status", "favorite")
    .order("created_at", { ascending: false });

  return (
    <AppShell title="Favoritos" nav={PACIENTE_NAV} currentPath="/paciente/favoritos">
      <div className="space-y-3">
        {(menus ?? []).map((menu) => (
          <MenuCard key={menu.id} title={menu.title} status={menu.status}>
            <pre className="max-h-32 overflow-auto text-xs">{JSON.stringify(menu.content_json, null, 2)}</pre>
          </MenuCard>
        ))}
        {!menus?.length && <p className="text-sm text-slate-500">Aún no tienes favoritos.</p>}
      </div>
      <Link href="/paciente" className="text-sm text-emerald-700 underline">← Inicio</Link>
    </AppShell>
  );
}
