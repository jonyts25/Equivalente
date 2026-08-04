import { redirect } from "next/navigation";
import { listDietTemplates } from "@/app/actions/diet-templates";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DietTemplateForm } from "@/components/nutritionist/DietTemplateForm";
import { getCurrentProfile } from "@/lib/auth/session";
import { getNutritionistByProfileId } from "@/lib/data/patient-context";
import { NUTRIOLOGO_NAV } from "@/lib/navigation";

export default async function NutriologoDietasPage() {
  const profile = await getCurrentProfile();
  if (!profile || !["admin", "nutritionist"].includes(profile.role)) redirect("/login");

  const nutritionist = await getNutritionistByProfileId(profile.id);
  const templates = nutritionist ? await listDietTemplates() : [];

  return (
    <AppShell title="Dietas" nav={NUTRIOLOGO_NAV} currentPath="/nutriologo/dietas">
      <p className="text-sm text-slate-600">
        Biblioteca de dietas base reutilizables. Al asignar una a un paciente, se crea su
        dieta activa a partir de la plantilla.
      </p>

      {!nutritionist && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-4 text-sm text-amber-900">
            No hay registro de nutrióloga vinculado a tu cuenta. Contacta al administrador.
          </CardContent>
        </Card>
      )}

      {nutritionist && templates.length === 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-4 text-sm text-amber-900">
            Sin plantillas todavía. Guarda tu primera dieta base abajo.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Plantillas guardadas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {templates.length === 0 && (
            <p className="text-sm text-slate-600">
              Aún no hay plantillas. Usa el formulario abajo para agregar una.
            </p>
          )}
          {templates.map((t) => (
            <div key={t.id} className="rounded border p-3 text-sm">
              <p className="font-medium">{t.title}</p>
              <pre className="mt-2 max-h-28 overflow-auto whitespace-pre-wrap text-xs text-slate-600">
                {t.raw_text?.slice(0, 400) || "Sin texto"}
                {(t.raw_text?.length ?? 0) > 400 ? "…" : ""}
              </pre>
            </div>
          ))}
        </CardContent>
      </Card>

      {nutritionist && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nueva plantilla</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-xs text-slate-500">
              Guarda el texto directamente — no requiere estructurar con IA.
            </p>
            <DietTemplateForm />
          </CardContent>
        </Card>
      )}
    </AppShell>
  );
}
