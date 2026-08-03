"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  loginDestinationForContext,
  loginErrorShouldSignOut,
  resolveAuthContext,
} from "@/lib/auth/context";
import { supabaseDebugLog } from "@/lib/auth/debug";

export async function signIn(formData: FormData) {
  supabaseDebugLog();

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirect") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  const resolved = await resolveAuthContext(supabase);
  if (!resolved.ok) {
    if (loginErrorShouldSignOut(resolved.code)) {
      await supabase.auth.signOut();
    }
    redirect(`/login?error=${encodeURIComponent(resolved.message)}`);
  }

  redirect(loginDestinationForContext(resolved.context, redirectTo));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
