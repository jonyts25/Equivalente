import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ManualMenuGenerator } from "@/components/menus/ManualMenuGenerator";
import { MenuCard } from "@/components/menus/MenuCard";
import { requirePatientContext } from "@/lib/auth/patient-session";
import { getPatientPromptContext } from "@/lib/data/patient-context";
import { PACIENTE_NAV } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";
import type { MenuStatus } from "@/types/database";

export default async function PacienteOpcionesManualPage() {
  const { patient } = await requirePatientContext();
  const ctx = await getPatientPromptContext(patient.id);
  const supabase = await createClient();

  const { data: approvedMenus } = await supabase
    .from("generated_menus")
    .select("id, title, status, explanation, content_json")
    .eq("patient_id", patient.id)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  return (
    <AppShell title="Pedir opciones" nav={PACIENTE_NAV} currentPath="/paciente/opciones">
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-slate-800">Menús aprobados</h2>
        {(approvedMenus ?? []).length === 0 ? (
          <p className="text-sm text-slate-500">Aún no hay menús aprobados por tu nutrióloga.</p>
        ) : (
          (approvedMenus ?? []).map((menu) => (
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pedir más opciones (ChatGPT manual)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-slate-600">
            Las opciones que generes quedarán como <strong>pendiente de revisión</strong> por tu
            nutrióloga. La generación automática con IA local solo la dispara tu nutrióloga.
          </p>
          <ManualMenuGenerator
            patientId={patient.id}
            task="generate_meal_options"
            title="Opciones solicitadas por paciente"
            defaultStatus="pending_review"
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
      <Link href="/paciente/opciones" className="text-sm text-emerald-700 underline">
        ← Opciones
      </Link>
    </AppShell>
  );
}
