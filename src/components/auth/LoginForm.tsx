"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  loginDestinationForContext,
  loginErrorShouldSignOut,
  resolveAuthContext,
} from "@/lib/auth/context";
import { supabaseDebugLog } from "@/lib/auth/debug";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function safeRedirectPath(path: string | undefined): string | null {
  if (!path || !path.startsWith("/") || path.startsWith("/login")) return null;
  return path;
}

export function LoginForm({
  redirect,
  initialError,
}: {
  redirect?: string;
  initialError?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState(initialError ?? "");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    supabaseDebugLog();

    const form = event.currentTarget;
    const email = String(new FormData(form).get("email") ?? "").trim();
    const password = String(new FormData(form).get("password") ?? "");
    const redirectTo = safeRedirectPath(String(new FormData(form).get("redirect") ?? ""));

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    const resolved = await resolveAuthContext(supabase);
    if (!resolved.ok) {
      if (loginErrorShouldSignOut(resolved.code)) {
        await supabase.auth.signOut();
      }
      setError(resolved.message);
      setLoading(false);
      return;
    }

    const destination = loginDestinationForContext(resolved.context, redirectTo);
    router.replace(destination);
    router.refresh();
  }

  return (
    <>
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <input type="hidden" name="redirect" value={redirect ?? ""} />
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required placeholder="tu@email.com" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Contraseña</Label>
          <Input id="password" name="password" type="password" required />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Entrando…" : "Entrar"}
        </Button>
      </form>
      <p className="mt-4 text-center text-xs text-slate-500">
        <Link href="/" className="underline">
          Volver al inicio
        </Link>
      </p>
    </>
  );
}
