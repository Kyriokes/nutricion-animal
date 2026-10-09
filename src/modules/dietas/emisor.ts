import type { Role } from "@/modules/usuarios/roles";

// RN-047: quien emitió una dieta sigue en la plataforma si conserva el rol de
// nutricionista (o es admin, que también puede crear dietas). Si perdió el
// rol, está bloqueado o su cuenta ya no existe (null), la dieta se sigue
// mostrando con un aviso que desaconseja continuarla.
export function isIssuerActive(roles: readonly Role[] | null): boolean {
  return roles !== null && (roles.includes("nutritionist") || roles.includes("admin"));
}
