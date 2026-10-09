import { z } from "zod";
import type { Result as BaseResult } from "@/lib/result";
import { hasPermission, type Actor, type Role } from "./roles";

// RN-024: quien quiere ser nutricionista o proveedor se postula desde su perfil.
export const NutritionistApplicationDataSchema = z.object({
  kind: z.literal("nutritionist"),
  address: z.string().trim().min(1, "La dirección es requerida").max(200, "La dirección puede tener hasta 200 caracteres"),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s()-]{6,20}$/, "El teléfono no es válido"),
  licenseNumber: z.string().trim().min(1, "La matrícula es requerida").max(40, "La matrícula puede tener hasta 40 caracteres"),
});

// Campos del formulario de proveedor: [A DEFINIR], por ahora solo el mínimo.
export const SupplierApplicationDataSchema = z.object({
  kind: z.literal("supplier"),
  businessName: z.string().trim().min(1, "El nombre del negocio es requerido").max(120, "El nombre del negocio puede tener hasta 120 caracteres"),
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
  // RN-044: motivo del rechazo, que ve el postulante.
  decisionNote: z.string().optional(),
  // RN-045: cuándo el postulante marcó como leído el resultado.
  seenAt: z.date().optional(),
});

export const DecisionNoteSchema = z.string().trim().min(1).max(200);

export type ApplicationData = z.infer<typeof ApplicationDataSchema>;
export type Application = z.infer<typeof ApplicationSchema>;
export type ApplicationStatus = Application["status"];

export type ApplicationError =
  | "blocked"
  | "already_has_role"
  | "already_pending"
  | "not_allowed"
  | "self_decision"
  | "invalid_note"
  | "already_decided";

type Result<T> = BaseResult<T, ApplicationError>;

const ROLE_BY_KIND: Record<ApplicationData["kind"], Role> = {
  nutritionist: "nutritionist",
  supplier: "supplier",
};

export type ApplicationKind = ApplicationData["kind"];
export const APPLICATION_KINDS = ["nutritionist", "supplier"] as const;

// "blocked": un usuario sin roles no tiene permisos (DT-019), tampoco para
// postularse. "pending": ya hay una del mismo tipo esperando decisión.
export type ApplicationOption = "available" | "pending" | "has_role" | "blocked";

function optionFor(
  kind: ApplicationKind,
  roles: readonly Role[],
  ownApplications: readonly Application[],
): ApplicationOption {
  if (roles.length === 0) return "blocked";
  if (roles.includes(ROLE_BY_KIND[kind])) return "has_role";
  const pending = ownApplications.some(
    (a) => a.status === "pending" && a.data.kind === kind,
  );
  return pending ? "pending" : "available";
}

// VU-01: qué puede hacer el usuario con cada tipo de postulación.
// `applications` son las del propio usuario.
export function applicationOptions(
  roles: readonly Role[],
  applications: readonly Application[],
): Record<ApplicationKind, ApplicationOption> {
  return {
    nutritionist: optionFor("nutritionist", roles, applications),
    supplier: optionFor("supplier", roles, applications),
  };
}

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
  const option = optionFor(
    input.data.kind,
    input.userRoles,
    input.existing.filter((a) => a.userId === input.userId),
  );
  if (option === "blocked") return { ok: false, error: "blocked" };
  if (option === "has_role") return { ok: false, error: "already_has_role" };
  if (option === "pending") return { ok: false, error: "already_pending" };

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
    decider: Actor;
    now: Date;
  },
): Result<{ application: Application }> {
  if (!hasPermission(input.decider.roles, "application.decide")) {
    return { ok: false, error: "not_allowed" };
  }
  // Nadie decide su propia postulación, salvo el administrador.
  if (
    input.application.userId === input.decider.id &&
    !input.decider.roles.includes("admin")
  ) {
    return { ok: false, error: "self_decision" };
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
  decider: Actor;
  now: Date;
}): Result<{ application: Application; roles: Role[] }> {
  const result = decide("approved", input);
  if (!result.ok) return result;
  // RN-024: un usuario bloqueado sigue bloqueado; aprobar le daría roles.
  if (input.applicantRoles.length === 0) return { ok: false, error: "blocked" };
  const granted = ROLE_BY_KIND[input.application.data.kind];
  return {
    ok: true,
    application: result.application,
    roles: [...new Set([...input.applicantRoles, granted])],
  };
}

// Rechazar no cambia los roles. El usuario puede volver a postularse.
// RN-044: exige una nota corta con el motivo, que ve el postulante.
export function rejectApplication(input: {
  application: Application;
  decider: Actor;
  note: string;
  now: Date;
}): Result<{ application: Application }> {
  const result = decide("rejected", input);
  if (!result.ok) return result;
  const note = DecisionNoteSchema.safeParse(input.note);
  if (!note.success) return { ok: false, error: "invalid_note" };
  return {
    ok: true,
    application: { ...result.application, decisionNote: note.data },
  };
}

// RN-045: resultados que el postulante todavía no marcó como leídos.
export function unseenDecisions(applications: readonly Application[]) {
  return applications.filter((a) => a.status !== "pending" && !a.seenAt);
}
