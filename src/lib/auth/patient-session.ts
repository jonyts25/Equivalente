import { redirect } from "next/navigation";
import { getCurrentPatient, getCurrentProfile } from "@/lib/auth/session";

export async function requirePatientContext() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "patient") redirect("/login");

  const patient = await getCurrentPatient();
  if (!patient) redirect("/login");

  return { profile, patient };
}
