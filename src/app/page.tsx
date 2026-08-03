import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { roleHomePath } from "@/lib/auth/session";
import { DisclaimerBanner } from "@/components/layout/DisclaimerBanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { UserRole } from "@/types/database";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role) {
      redirect(roleHomePath(profile.role as UserRole));
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-6 p-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-emerald-700">Equivalente</h1>
        <p className="mt-2 text-slate-600">Más opciones sin salirte del plan.</p>
      </div>
      <DisclaimerBanner />
      <Card>
        <CardHeader>
          <CardTitle>PWA privada de equivalencias</CardTitle>
          <CardDescription>
            Convierte una dieta prescrita en opciones equivalentes, personalizadas y auditables.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button asChild className="w-full">
            <Link href="/login">Iniciar sesión</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
