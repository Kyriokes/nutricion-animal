import { z } from "zod";

// RN-002: un usuario puede tener varios roles a la vez.
export const ROLES = [
  "admin",
  "customer",
  "nutritionist",
  "supplier",
  "auditor",
] as const;

export const RoleSchema = z.enum(ROLES);
export type Role = z.infer<typeof RoleSchema>;

// Solo permisos que las reglas de negocio ya definen.
export const PERMISSIONS = [
  "pet.register", // RN-010
  "order.create", // RN-011
  "nutritionist.search", // RN-012
  "product.search_by_pet", // RN-013
  "product.search_by_diet", // RN-014
  "diet.view_assigned", // RN-015
  "order.view_own", // RN-060
  "diet.create_generic", // RN-021
  "diet.create_specific", // RN-022
  "diet.assign", // RN-023
  "product.publish", // RN-030
  "product.review", // RN-041
  "application.decide", // RN-024, RN-043
  "order.view_all", // RN-061
  "user.manage_roles", // VA-10
] as const;

export const PermissionSchema = z.enum(PERMISSIONS);
export type Permission = z.infer<typeof PermissionSchema>;

const CUSTOMER_PERMISSIONS: readonly Permission[] = [
  "pet.register",
  "order.create",
  "nutritionist.search",
  "product.search_by_pet",
  "product.search_by_diet",
  "diet.view_assigned",
  "order.view_own",
];

// Cada rol lleva su lista explícita de permisos, sin herencia entre roles.
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  // RN-001: acceso total.
  admin: PERMISSIONS,
  customer: CUSTOMER_PERMISSIONS,
  // RN-020: puede hacer todo lo que hace el Cliente.
  nutritionist: [
    ...CUSTOMER_PERMISSIONS,
    "diet.create_generic",
    "diet.create_specific",
    "diet.assign",
  ],
  supplier: ["product.publish"],
  // RN-040: administrador con menos permisos. RN-041 y RN-043.
  auditor: ["product.review", "application.decide"],
};

// Un usuario sin roles no tiene ningún permiso.
export function hasPermission(
  roles: readonly Role[],
  permission: Permission,
): boolean {
  return roles.some((role) => ROLE_PERMISSIONS[role].includes(permission));
}
