import { getCurrentProfile } from "@/lib/auth/session";
import { getNutritionistByProfileId } from "@/lib/data/patient-context";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";

export async function assertContextualAiAccess(patientId: string): Promise<
  | { ok: true; role: UserRole; profileId: string }
  | { ok: false; status: number; error: string }
> {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { ok: false, status: 401, error: "No autenticado." };
  }

  if (profile.role === "patient") {
    return {
      ok: false,
      status: 403,
      error: "Pacientes no pueden usar IA contextual todavía.",
    };
  }

  if (profile.role === "admin") {
    return { ok: true, role: "admin", profileId: profile.id };
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
      return {
        ok: false,
        status: 403,
        error: "No tienes acceso a este paciente.",
      };
    }

    return { ok: true, role: "nutritionist", profileId: profile.id };
  }

  return { ok: false, status: 403, error: "Rol no autorizado." };
}
