/**
 * Auth context unit tests (no DB).
 */
import {
  isValidUserRole,
  loginDestinationForContext,
  loginErrorShouldSignOut,
  pickActiveRecord,
  type AuthContext,
} from "../src/lib/auth/context";
import type { Profile } from "../src/types/database";

let failed = 0;

function assert(name: string, condition: boolean, detail?: string) {
  if (!condition) {
    failed++;
    console.log("FAIL", name, detail ?? "");
  } else {
    console.log("PASS", name);
  }
}

assert("valid admin role", isValidUserRole("admin"));
assert("valid nutritionist role", isValidUserRole("nutritionist"));
assert("valid patient role", isValidUserRole("patient"));
assert("invalid nutriologo role", !isValidUserRole("nutriologo"));
assert("invalid paciente role", !isValidUserRole("paciente"));

const baseProfile: Profile = {
  id: "p1",
  full_name: "Demo",
  role: "admin",
  created_at: "",
  updated_at: "",
};

const adminContext: AuthContext = {
  user: { id: "p1", email: "admin@equivalente.local" } as AuthContext["user"],
  profile: baseProfile,
  nutritionist: null,
  patient: null,
};

assert("admin home", loginDestinationForContext(adminContext) === "/admin");
assert("admin redirect safe", loginDestinationForContext(adminContext, "/admin/pacientes") === "/admin/pacientes");
assert("admin redirect login ignored", loginDestinationForContext(adminContext, "/login") === "/admin");

const nutritionistContext: AuthContext = {
  ...adminContext,
  profile: { ...baseProfile, role: "nutritionist" },
  nutritionist: {
    id: "n1",
    profile_id: "p1",
    display_name: "Dra",
    active: true,
    created_at: "2025-01-01",
  },
};

assert("nutritionist home", loginDestinationForContext(nutritionistContext) === "/nutriologo");

const duplicates = [
  { id: "old", active: false, created_at: "2024-01-01" },
  { id: "new", active: true, created_at: "2025-06-01" },
  { id: "also", active: true, created_at: "2025-07-01" },
];
const picked = pickActiveRecord(duplicates, "test");
assert("pick newest active", picked?.id === "also");
assert("inactive ignored", pickActiveRecord([{ id: "x", active: false, created_at: "2025-01-01" }], "test") === null);

assert("profile missing signs out", loginErrorShouldSignOut("no_profile"));
assert("db error does not sign out", !loginErrorShouldSignOut("profile_db_error"));

console.log(`\nAuth tests complete. Failures: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
