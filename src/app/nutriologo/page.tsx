import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { DisclaimerBanner } from "@/components/layout/DisclaimerBanner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentProfile } from "@/lib/auth/session";
import { getNutritionistByProfileId } from "@/lib/data/patient-context";
import { NUTRIOLOGO_NAV } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function NutriologoDashboard() {
  const profile = await getCurrentProfile();
  if (!profile || !["admin", "nutritionist"].includes(profile.role)) redirect("/login");

  const supabase = await createClient();
  const nutritionist = await getNutritionistByProfileId(profile.id);

  let patientCount = 0;
  if (nutritionist) {
    const { count } = await supabase
      .from("patients")
      .select("*", { count: "exact", head: true })
      .eq("nutritionist_id", nutritionist.id);
    patientCount = count ?? 0;
  }

  return (
    <AppShell title="Inicio" nav={NUTRIOLOGO_NAV} currentPath="/nutriologo">
      <DisclaimerBanner />
      <Card>
        <CardHeader><CardTitle className="text-base">Tus pacientes</CardTitle></CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{patientCount}</p>
          <Link href="/nutriologo/pacientes" className="mt-2 inline-block text-sm text-emerald-700 underline">
            Ver pacientes →
          </Link>
          <Link href="/nutriologo/ia-local" className="mt-2 ml-4 inline-block text-sm text-emerald-700 underline">
            IA local (dev) →
          </Link>
        </CardContent>
      </Card>
    </AppShell>
  );
}
