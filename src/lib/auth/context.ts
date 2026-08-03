import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Patient, Profile, UserRole } from "@/types/database";
import { roleHomePath } from "@/lib/auth/roles";
import { authDebugLog } from "@/lib/auth/debug";

export const VALID_USER_ROLES: readonly UserRole[] = ["admin", "nutritionist", "patient"];

export function isValidUserRole(role: string | null | undefined): role is UserRole {
  return VALID_USER_ROLES.includes(role as UserRole);
}

export type NutritionistRow = {
  id: string;
  profile_id: string;
  display_name: string;
  active: boolean;
  created_at: string;
};

export type PatientRow = Pick<
  Patient,
  "id" | "profile_id" | "nutritionist_id" | "full_name" | "active" | "created_at" | "precision_mode"
>;

export type AuthContext = {
  user: User;
  profile: Profile;
  nutritionist: NutritionistRow | null;
  patient: PatientRow | null;
};

export type AuthResolveFailure = {
  ok: false;
  code:
    | "no_user"
    | "no_profile"
    | "profile_db_error"
    | "invalid_role"
    | "no_active_nutritionist"
    | "no_active_patient"
    | "nutritionist_db_error"
    | "patient_db_error";
  message: string;
  debug: Record<string, unknown>;
};

export type AuthResolveResult = { ok: true; context: AuthContext } | AuthResolveFailure;

export function pickActiveRecord<T extends { active: boolean; created_at: string }>(
  rows: T[],
  label: string
): T | null {
  const active = rows.filter((row) => row.active);
  if (active.length === 0) return null;
  active.sort((a, b) => b.created_at.localeCompare(a.created_at));
  if (active.length > 1) {
    authDebugLog(`${label}:multiple-active`, {
      count: active.length,
      ids: active.map((row) => (row as { id?: string }).id),
    });
  }
  return active[0] ?? null;
}

export async function getAuthUser(supabase: SupabaseClient) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  return { user, error };
}

export async function getProfileByUserId(supabase: SupabaseClient, userId: string) {
  return supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
}

export async function getActiveNutritionistsByProfileId(
  supabase: SupabaseClient,
  profileId: string
) {
  return supabase
    .from("nutritionists")
    .select("id, profile_id, display_name, active, created_at")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });
}

export async function getActivePatientsByProfileId(
  supabase: SupabaseClient,
  profileId: string
) {
  return supabase
    .from("patients")
    .select("id, profile_id, nutritionist_id, full_name, active, created_at, precision_mode")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });
}

export async function resolveAuthContext(supabase: SupabaseClient): Promise<AuthResolveResult> {
  const { user, error: userError } = await getAuthUser(supabase);

  if (userError || !user) {
    const debug = { userId: null, userError: userError?.message ?? null };
    authDebugLog("resolve:no-user", debug);
    return {
      ok: false,
      code: "no_user",
      message: "No autenticado.",
      debug,
    };
  }

  const { data: profile, error: profileError } = await getProfileByUserId(supabase, user.id);

  if (profileError) {
    const debug = {
      userId: user.id,
      email: user.email,
      profileError: profileError.message,
      profileCode: profileError.code,
    };
    authDebugLog("resolve:profile-db-error", debug);
    return {
      ok: false,
      code: "profile_db_error",
      message: `Error al cargar perfil: ${profileError.message}`,
      debug,
    };
  }

  if (!profile) {
    const debug = { userId: user.id, email: user.email, profile: null };
    authDebugLog("resolve:no-profile", debug);
    return {
      ok: false,
      code: "no_profile",
      message:
        "Tu cuenta no tiene perfil configurado. Pide al administrador que asigne tu rol.",
      debug,
    };
  }

  if (!isValidUserRole(profile.role)) {
    const debug = {
      userId: user.id,
      email: user.email,
      role: profile.role,
    };
    authDebugLog("resolve:invalid-role", debug);
    return {
      ok: false,
      code: "invalid_role",
      message: `Rol no válido: ${profile.role ?? "(vacío)"}. Contacta al administrador.`,
      debug,
    };
  }

  let nutritionist: NutritionistRow | null = null;
  let patient: PatientRow | null = null;

  if (profile.role === "nutritionist") {
    const { data: nutritionists, error: nutritionistError } =
      await getActiveNutritionistsByProfileId(supabase, profile.id);

    if (nutritionistError) {
      const debug = {
        userId: user.id,
        email: user.email,
        profile,
        nutritionistError: nutritionistError.message,
      };
      authDebugLog("resolve:nutritionist-db-error", debug);
      return {
        ok: false,
        code: "nutritionist_db_error",
        message: `Error al cargar nutriólogo: ${nutritionistError.message}`,
        debug,
      };
    }

    nutritionist = pickActiveRecord(nutritionists ?? [], "nutritionist");
    if (!nutritionist) {
      const debug = {
        userId: user.id,
        email: user.email,
        profile,
        nutritionist: null,
      };
      authDebugLog("resolve:no-active-nutritionist", debug);
      return {
        ok: false,
        code: "no_active_nutritionist",
        message:
          "Tu cuenta de nutriólogo no está activa. Pide al administrador que revise tu registro.",
        debug,
      };
    }
  }

  if (profile.role === "patient") {
    const { data: patients, error: patientError } = await getActivePatientsByProfileId(
      supabase,
      profile.id
    );

    if (patientError) {
      const debug = {
        userId: user.id,
        email: user.email,
        profile,
        patientError: patientError.message,
      };
      authDebugLog("resolve:patient-db-error", debug);
      return {
        ok: false,
        code: "patient_db_error",
        message: `Error al cargar paciente: ${patientError.message}`,
        debug,
      };
    }

    patient = pickActiveRecord(patients ?? [], "patient");
    if (!patient) {
      const debug = {
        userId: user.id,
        email: user.email,
        profile,
        patient: null,
      };
      authDebugLog("resolve:no-active-patient", debug);
      return {
        ok: false,
        code: "no_active_patient",
        message:
          "Tu cuenta de paciente no está activa. Pide al administrador que revise tu registro.",
        debug,
      };
    }
  }

  const debug = {
    userId: user.id,
    email: user.email,
    profile,
    role: profile.role,
    nutritionist,
    patient,
  };
  authDebugLog("resolve:ok", debug);

  return {
    ok: true,
    context: {
      user,
      profile: profile as Profile,
      nutritionist,
      patient,
    },
  };
}

export function loginDestinationForContext(
  context: AuthContext,
  redirectTo?: string | null
): string {
  const safeRedirect =
    redirectTo && redirectTo.startsWith("/") && !redirectTo.startsWith("/login")
      ? redirectTo
      : null;
  return safeRedirect ?? roleHomePath(context.profile.role);
}

export function loginErrorShouldSignOut(code: AuthResolveFailure["code"]): boolean {
  return (
    code === "no_profile" ||
    code === "invalid_role" ||
    code === "no_active_nutritionist" ||
    code === "no_active_patient"
  );
}
