import { z } from "zod";
import type { Result } from "@/lib/result";
import { RoleSchema, hasPermission, type Actor, type Role } from "./roles";

const UserUpdateSchema = z.object({
  roles: z.array(RoleSchema),
  adminNote: z.string().max(500, "La nota puede tener hasta 500 caracteres"),
});

export type UserUpdate = { roles: Role[]; adminNote: string | null };

// VA-10: el admin cambia los roles de un usuario (por ejemplo, lo nombra
// auditor, RN-040) y su nota interna (DT-021). Dejarlo sin roles lo bloquea
// sin borrarlo (DT-019). Un admin no puede quitarse su propio rol de admin,
// para no dejar el sistema sin quien lo administre.
export function planUserUpdate(input: {
  actor: Actor;
  target: { id: string; roles: readonly Role[] };
  input: unknown;
}): Result<{ update: UserUpdate }, "not_allowed" | "invalid" | "self_demotion"> {
  if (!hasPermission(input.actor.roles, "user.manage_roles")) {
    return { ok: false, error: "not_allowed" };
  }
  const parsed = UserUpdateSchema.safeParse(input.input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const roles = [...new Set(parsed.data.roles)];
  if (
    input.target.id === input.actor.id &&
    input.target.roles.includes("admin") &&
    !roles.includes("admin")
  ) {
    return { ok: false, error: "self_demotion" };
  }
  const note = parsed.data.adminNote.trim();
  return { ok: true, update: { roles, adminNote: note || null } };
}
