import {
  hasPermission,
  type Actor,
  type Permission,
} from "@/modules/usuarios/roles";
import type { Diet, DietVersion } from "./schema";

export type DietError =
  | "not_allowed"
  | "not_owner"
  | "version_not_found"
  | "version_frozen"
  | "last_version"
  | "pet_not_assigned"
  | "already_assigned"
  | "already_ended";

// RN-021: cada nutricionista maneja solo sus propias dietas. Además hace falta
// el permiso: un usuario sin roles no puede actuar aunque sea el dueño.
// RN-001: el admin es omnipotente y puede actuar sobre cualquier dieta.
export function authorize(
  actor: Actor,
  diet: Diet,
  permission: Permission,
): "not_allowed" | "not_owner" | null {
  if (!hasPermission(actor.roles, permission)) return "not_allowed";
  if (actor.id !== diet.nutritionistId && !actor.roles.includes("admin")) {
    return "not_owner";
  }
  return null;
}

export function versionsOf(
  diet: Diet,
  versions: readonly DietVersion[],
): DietVersion[] {
  return versions.filter((v) => v.dietId === diet.id);
}

export function latestVersion(
  versions: readonly DietVersion[],
): DietVersion | undefined {
  return versions.reduce<DietVersion | undefined>(
    (latest, v) => (!latest || v.number > latest.number ? v : latest),
    undefined,
  );
}
