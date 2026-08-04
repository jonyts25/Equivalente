"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/session";
import { getNutritionistByProfileId } from "@/lib/data/patient-context";
import { createAdminClient } from "@/lib/supabase/admin";

function generateTemporaryPassword(length = 12): string {
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const bytes = randomBytes(length);
  let password = "";
  for (let i = 0; i < length; i++) {
    password += alphabet[bytes[i]! % alphabet.length];
  }
  return password;
}

export async function createPatient(input: {
  fullName: string;
  email: string;
  phone?: string;
  goal?: string;
}): Promise<{ patientId: string; temporaryPassword: string; email: string }> {
  const profile = await getCurrentProfile();
  if (!profile || !["admin", "nutritionist"].includes(profile.role)) {
    throw new Error("No autorizado");
  }

  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();
  const phone = input.phone?.trim() || undefined;
  const goal = input.goal?.trim() || undefined;

  if (!fullName) throw new Error("El nombre completo es obligatorio.");
  if (!email || !email.includes("@")) throw new Error("Email inválido.");

  const nutritionist = await getNutritionistByProfileId(profile.id);
  if (!nutritionist) {
    throw new Error(
      "No hay registro de nutrióloga vinculado a tu cuenta. Contacta al administrador."
    );
  }

  const admin = createAdminClient();
  const temporaryPassword = generateTemporaryPassword(12);

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (createError || !created.user?.id) {
    throw new Error(
      createError?.message ?? "No se pudo crear el usuario de acceso del paciente."
    );
  }

  const userId = created.user.id;

  const notes = phone ? `Teléfono: ${phone}` : null;

  const { data: patient, error: patientError } = await admin
    .from("patients")
    .insert({
      profile_id: userId,
      nutritionist_id: nutritionist.id,
      full_name: fullName,
      goal: goal ?? null,
      notes,
      active: true,
    })
    .select("id")
    .single();

  if (patientError || !patient?.id) {
    try {
      await admin.auth.admin.deleteUser(userId);
    } catch {
      // Best-effort cleanup; surface the original insert error.
    }
    throw new Error(
      patientError?.message ?? "No se pudo crear el registro clínico del paciente."
    );
  }

  revalidatePath("/nutriologo/pacientes");
  revalidatePath(`/nutriologo/pacientes/${patient.id}`);

  return {
    patientId: patient.id,
    temporaryPassword,
    email,
  };
}
