import { getCurrentProfile } from "@/lib/auth/session";
import { getNutritionistByProfileId } from "@/lib/data/patient-context";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";

export async function assertProgressAccess(patientId: string): Promise<
  | { ok: true; role: UserRole; profileId: string; canWrite: boolean }
  | { ok: false; status: number; error: string }
> {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { ok: false, status: 401, error: "No autenticado." };
  }

  if (profile.role === "admin") {
    return { ok: true, role: "admin", profileId: profile.id, canWrite: true };
  }

  if (profile.role === "nutritionist") {
    const nutritionist = await getNutritionistByProfileId(profile.id);
    if (!nutritionist) {
      return { ok: false, status: 403, error: "Nutriólogo no configurado." };
    }

    const supabase = await createClient();
    const { data: patient } = await supabase
      .from("patients")
      .select("id")
      .eq("id", patientId)
      .eq("nutritionist_id", nutritionist.id)
      .maybeSingle();

    if (!patient) {
      return { ok: false, status: 403, error: "No tienes acceso a este paciente." };
    }

    return { ok: true, role: "nutritionist", profileId: profile.id, canWrite: true };
  }

  if (profile.role === "patient") {
    const supabase = await createClient();
    const { data: patient } = await supabase
      .from("patients")
      .select("id")
      .eq("id", patientId)
      .eq("profile_id", profile.id)
      .maybeSingle();

    if (!patient) {
      return { ok: false, status: 403, error: "No autorizado." };
    }

    return { ok: true, role: "patient", profileId: profile.id, canWrite: false };
  }

  return { ok: false, status: 403, error: "Rol no autorizado." };
}

export async function assertProgressWriteAccess(patientId: string) {
  const access = await assertProgressAccess(patientId);
  if (!access.ok) return access;
  if (!access.canWrite) {
    return {
      ok: false as const,
      status: 403,
      error: "Pacientes no pueden modificar seguimiento clínico.",
    };
  }
  return access;
}

export async function assertProgressAnalysisAccess(patientId: string) {
  const access = await assertProgressWriteAccess(patientId);
  if (!access.ok) return access;
  return access;
}
