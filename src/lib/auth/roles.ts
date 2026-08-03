import type { UserRole } from "@/types/database";

export function roleHomePath(role: UserRole): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "nutritionist":
      return "/nutriologo";
    case "patient":
      return "/paciente";
  }
}

export function assertRole(profileRole: UserRole, allowed: UserRole[]): void {
  if (!allowed.includes(profileRole)) {
    throw new Error("Forbidden");
  }
}

export function canAccessPatient(
  role: UserRole,
  userId: string,
  patientProfileId: string | null,
  nutritionistProfileId?: string | null
): boolean {
  if (role === "admin") return true;
  if (role === "patient" && patientProfileId === userId) return true;
  if (role === "nutritionist" && nutritionistProfileId === userId) return true;
  return false;
}
