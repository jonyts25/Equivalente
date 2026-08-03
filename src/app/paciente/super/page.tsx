import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ManualMenuGenerator } from "@/components/menus/ManualMenuGenerator";
import { requirePatientContext } from "@/lib/auth/patient-session";
import { getPatientPromptContext } from "@/lib/data/patient-context";
import { PACIENTE_NAV } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function PacienteSuperPage() {
  const { patient } = await requirePatientContext();
  const ctx = await getPatientPromptContext(patient.id);
  const supabase = await createClient();

  const { data: menus } = await supabase
    .from("generated_menus")
    .select("title, content_json")
    .eq("patient_id", patient.id)
    .eq("status", "approved")
    .limit(10);

  const menusSummary = (menus ?? [])
    .map((m) => `${m.title}: ${JSON.stringify(m.content_json)}`)
    .join("\n");

  return (
    <AppShell title="Lista de súper" nav={PACIENTE_NAV} currentPath="/paciente/super">
      <Card>
        <CardHeader><CardTitle className="text-base">Generar lista de súper</CardTitle></CardHeader>
        <CardContent>
          <ManualMenuGenerator
            patientId={patient.id}
            task="shopping_list"
            title="Lista de súper"
            defaultStatus="pending_review"
            context={{
              patientName: ctx.patientName,
              menusSummary: menusSummary || "Sin menús aprobados aún.",
              days: 7,
            }}
          />
        </CardContent>
      </Card>
      <Link href="/paciente" className="text-sm text-emerald-700 underline">← Inicio</Link>
    </AppShell>
  );
}
