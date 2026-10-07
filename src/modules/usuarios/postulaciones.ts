import { z } from "zod";
import { hasPermission, type Role } from "./roles";

// RN-024: quien quiere ser nutricionista o proveedor se postula desde su perfil.
export const NutritionistApplicationDataSchema = z.object({
  kind: z.literal("nutritionist"),
  address: z.string().trim().min(1, "La dirección es requerida"),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s()-]{6,20}$/, "El teléfono no es válido"),
  licenseNumber: z.string().trim().min(1, "La matrícula es requerida"),
});

// Campos del formulario de proveedor: [A DEFINIR], por ahora solo el mínimo.
export const SupplierApplicationDataSchema = z.object({
  kind: z.literal("supplier"),
  businessName: z.string().trim().min(1, "El nombre del negocio es requerido"),
});

export const ApplicationDataSchema = z.discriminatedUnion("kind", [
  NutritionistApplicationDataSchema,
  SupplierApplicationDataSchema,
]);

export const APPLICATION_STATUSES = ["pending", "approved", "rejected"] as const;

export const ApplicationSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  data: ApplicationDataSchema,
  status: z.enum(APPLICATION_STATUSES),
  submittedAt: z.date(),
  decidedAt: z.date().optional(),
  decidedBy: z.uuid().optional(),
});

export type ApplicationData = z.infer<typeof ApplicationDataSchema>;
export type Application = z.infer<typeof ApplicationSchema>;
export type ApplicationStatus = Application["status"];

export type ApplicationError =
  | "already_has_role"
  | "already_pending"
  | "not_allowed"
  | "already_decided";

type Result<T> = ({ ok: true } & T) | { ok: false; error: ApplicationError };

const ROLE_BY_KIND: Record<ApplicationData["kind"], Role> = {
  nutritionist: "nutritionist",
  supplier: "supplier",
};

// Mientras está pendiente el usuario sigue con sus roles actuales (RN-024):
// la postulación no cambia sus roles.
export function submitApplication(input: {
  id: string;
  userId: string;
  userRoles: readonly Role[];
  existing: readonly Application[];
  data: ApplicationData;
  now: Date;
}): Result<{ application: Application }> {
  if (input.userRoles.includes(ROLE_BY_KIND[input.data.kind])) {
    return { ok: false, error: "already_has_role" };
  }
  const hasPending = input.existing.some(
    (a) =>
      a.userId === input.userId &&
      a.status === "pending" &&
      a.data.kind === input.data.kind,
  );
  if (hasPending) return { ok: false, error: "already_pending" };

  return {
    ok: true,
    application: {
      id: input.id,
      userId: input.userId,
      data: input.data,
      status: "pending",
      submittedAt: input.now,
    },
  };
}

function decide(
  status: "approved" | "rejected",
  input: {
    application: Application;
    decider: { id: string; roles: readonly Role[] };
    now: Date;
  },
): Result<{ application: Application }> {
  if (!hasPermission(input.decider.roles, "application.decide")) {
    return { ok: false, error: "not_allowed" };
  }
  if (input.application.status !== "pending") {
    return { ok: false, error: "already_decided" };
  }
  return {
    ok: true,
    application: {
      ...input.application,
      status,
      decidedAt: input.now,
      decidedBy: input.decider.id,
    },
  };
}

// Aprobar agrega el rol correspondiente a los roles del postulante.
export function approveApplication(input: {
  application: Application;
  applicantRoles: readonly Role[];
  decider: { id: string; roles: readonly Role[] };
  now: Date;
}): Result<{ application: Application; roles: Role[] }> {
  const result = decide("approved", input);
  if (!result.ok) return result;
  const granted = ROLE_BY_KIND[input.application.data.kind];
  return {
    ok: true,
    application: result.application,
    roles: [...new Set([...input.applicantRoles, granted])],
  };
}

// Rechazar no cambia los roles. El usuario puede volver a postularse.
export function rejectApplication(input: {
  application: Application;
  decider: { id: string; roles: readonly Role[] };
  now: Date;
}): Result<{ application: Application }> {
  return decide("rejected", input);
}
