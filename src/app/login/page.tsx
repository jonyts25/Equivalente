import { DisclaimerBanner } from "@/components/layout/DisclaimerBanner";
import { LoginForm } from "@/components/auth/LoginForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; redirect?: string }>;
}) {
  const params = await searchParams;
  const initialError = params.error ? decodeURIComponent(params.error) : undefined;

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 p-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-emerald-700">Equivalente</h1>
        <p className="text-sm text-slate-500">Inicia sesión</p>
      </div>
      <DisclaimerBanner />
      <Card>
        <CardHeader>
          <CardTitle>Acceso</CardTitle>
          <CardDescription>Admin, nutriólogo o paciente</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm redirect={params.redirect} initialError={initialError} />
        </CardContent>
      </Card>
    </div>
  );
}
