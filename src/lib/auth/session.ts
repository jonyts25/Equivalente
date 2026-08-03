import { createClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/types/database";
import { roleHomePath } from "@/lib/auth/roles";
import {
  getActiveNutritionistsByProfileId,
  getActivePatientsByProfileId,
  getAuthUser,
  getProfileByUserId,
  pickActiveRecord,
  type NutritionistRow,
  type PatientRow,
} from "@/lib/auth/context";
import { authDebugLog } from "@/lib/auth/debug";

export { roleHomePath };

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const { user, error: userError } = await getAuthUser(supabase);
  if (userError || !user) return null;

  const { data: profile, error: profileError } = await getProfileByUserId(supabase, user.id);
  if (profileError) {
    authDebugLog("getCurrentProfile:error", {
      userId: user.id,
      email: user.email,
      profileError: profileError.message,
    });
    return null;
  }

  return (profile as Profile | null) ?? null;
}

export async function getCurrentUserRole(): Promise<UserRole | null> {
  const profile = await getCurrentProfile();
  return profile?.role ?? null;
}

export async function getCurrentNutritionist(): Promise<NutritionistRow | null> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "nutritionist") return null;

  const supabase = await createClient();
  const { data, error } = await getActiveNutritionistsByProfileId(supabase, profile.id);
  if (error) {
    authDebugLog("getCurrentNutritionist:error", {
      profileId: profile.id,
      error: error.message,
    });
    return null;
  }
  return pickActiveRecord(data ?? [], "nutritionist");
}

export async function getCurrentPatient(): Promise<PatientRow | null> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "patient") return null;

  const supabase = await createClient();
  const { data, error } = await getActivePatientsByProfileId(supabase, profile.id);
  if (error) {
    authDebugLog("getCurrentPatient:error", {
      profileId: profile.id,
      error: error.message,
    });
    return null;
  }
  return pickActiveRecord(data ?? [], "patient");
}

export async function requireRole(allowed: UserRole[]): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile || !allowed.includes(profile.role)) {
    throw new Error("Unauthorized");
  }
  return profile;
}

export function roleLabel(role: UserRole): string {
  switch (role) {
    case "admin":
      return "Admin";
    case "nutritionist":
      return "Nutriólogo";
    case "patient":
      return "Paciente";
  }
}
