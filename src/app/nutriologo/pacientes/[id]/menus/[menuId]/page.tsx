import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { MenuActions } from "@/components/menus/MenuActions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  extractIaDraftSummary,
  isIaLocalContextualDraft,
} from "@/lib/ai/contextual-draft";
import { getCurrentProfile } from "@/lib/auth/session";
import { NUTRIOLOGO_NAV } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";
import type { MenuStatus } from "@/types/database";

export default async function MenuDetailPage({
  params,
}: {
  params: Promise<{ id: string; menuId: string }>;
}) {
  const { id: patientId, menuId } = await params;
  const profile = await getCurrentProfile();
  if (!profile || !["admin", "nutritionist"].includes(profile.role)) redirect("/login");

  const supabase = await createClient();
  const { data: menu } = await supabase
    .from("generated_menus")
    .select("*, meal_slots(name)")
    .eq("id", menuId)
    .eq("patient_id", patientId)
    .maybeSingle();

  if (!menu) notFound();

  const content = menu.content_json as Record<string, unknown>;
  const isIa = isIaLocalContextualDraft(content);
  const summary = isIa ? extractIaDraftSummary(content) : null;
  const role = profile.role === "admin" ? "admin" : "nutritionist";

  const mealSlot = menu.meal_slots as { name: string } | { name: string }[] | null;
  const mealName = Array.isArray(mealSlot) ? mealSlot[0]?.name : mealSlot?.name;

  return (
    <AppShell title="Detalle de menú" nav={NUTRIOLOGO_NAV} currentPath="/nutriologo/pacientes">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{menu.title}</CardTitle>
            <p className="text-xs text-slate-500 mt-1">
              {new Date(menu.created_at).toLocaleString("es-MX")}
              {mealName && ` · ${mealName}`}
            </p>
          </div>
          <Badge>{menu.status as MenuStatus}</Badge>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {isIa && (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertTitle>Generado por IA local</AlertTitle>
              <AlertDescription>
                Debe revisarse antes de mostrarse al paciente. Las equivalencias demo deben validarse
                con nutrióloga antes de uso clínico.
              </AlertDescription>
            </Alert>
          )}

          {summary?.preguntaOriginal && (
            <div>
              <p className="text-xs font-medium uppercase text-slate-500">Pregunta original</p>
              <p className="mt-1">{summary.preguntaOriginal}</p>
            </div>
          )}

          {menu.explanation && (
            <div>
              <p className="text-xs font-medium uppercase text-slate-500">Respuesta para paciente</p>
              <p className="mt-1 leading-relaxed">{menu.explanation}</p>
            </div>
          )}

          {summary?.motivoRevision && (
            <div>
              <p className="text-xs font-medium uppercase text-slate-500">Motivo de revisión</p>
              <p className="mt-1 text-amber-900">{summary.motivoRevision}</p>
            </div>
          )}

          {summary && (
            <div className="flex flex-wrap gap-2 items-center">
              {summary.requiereRevision && (
                <Badge className="bg-amber-100 text-amber-900">Requiere revisión</Badge>
              )}
              {summary.confianza != null && (
                <Badge variant="outline">Confianza: {summary.confianza.toFixed(2)}</Badge>
              )}
              {summary.model && (
                <Badge variant="outline">{summary.provider}/{summary.model}</Badge>
              )}
              {summary.flags.map((f) => (
                <Badge key={f} variant="outline" className="font-normal">{f}</Badge>
              ))}
            </div>
          )}

          {content.contextoResumido != null && (
            <div>
              <p className="text-xs font-medium uppercase text-slate-500 mb-1">Contexto usado (resumen)</p>
              <pre className="max-h-40 overflow-auto rounded border bg-slate-50 p-2 text-xs">
                {JSON.stringify(content.contextoResumido, null, 2)}
              </pre>
            </div>
          )}

          <details className="rounded border p-3">
            <summary className="cursor-pointer text-xs font-medium text-slate-600">
              JSON técnico (solo nutriólogo/admin)
            </summary>
            <pre className="mt-2 max-h-64 overflow-auto text-xs">
              {JSON.stringify(content, null, 2)}
            </pre>
          </details>

          <MenuActions
            menuId={menu.id}
            role={role}
            patientId={patientId}
            isIaDraft={isIa}
          />
        </CardContent>
      </Card>

      <Link
        href={`/nutriologo/pacientes/${patientId}/menus`}
        className="mt-4 inline-block text-sm text-emerald-700 underline"
      >
        ← Menús del paciente
      </Link>
    </AppShell>
  );
}
