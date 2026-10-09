import { and, desc, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  ApplicationDataSchema,
  approveApplication,
  rejectApplication,
  submitApplication,
  type Application,
  type ApplicationData,
  type ApplicationError,
} from "./postulaciones";
import { RoleSchema, type Actor, type Role } from "./roles";
import { applications, users } from "./tables";

type ApplicationRow = typeof applications.$inferSelect;

// Convierte una fila en Application. Si los datos guardados no cumplen el
// esquema (no debería pasar), se descarta en vez de romper la pantalla.
function toApplication(row: ApplicationRow): Application | null {
  const data = ApplicationDataSchema.safeParse(row.data);
  if (!data.success) return null;
  const status = row.status as Application["status"];
  return {
    id: row.id,
    userId: row.userId,
    data: data.data,
    status,
    submittedAt: row.submittedAt,
    ...(row.decidedAt ? { decidedAt: row.decidedAt } : {}),
    ...(row.decidedBy ? { decidedBy: row.decidedBy } : {}),
  };
}

const onlyValid = (rows: ApplicationRow[]) =>
  rows.map(toApplication).filter((a): a is Application => a !== null);

const knownRoles = (roles: string[]) =>
  roles.filter((r): r is Role => RoleSchema.safeParse(r).success);

// VU-01: el usuario cambia su nombre.
export async function updateUserName(userId: string, name: string) {
  await db.update(users).set({ name }).where(eq(users.id, userId));
}

export async function listOwnApplications(userId: string) {
  const rows = await db
    .select()
    .from(applications)
    .where(eq(applications.userId, userId))
    .orderBy(desc(applications.submittedAt));
  return onlyValid(rows);
}

// RN-024: crea la postulación si las reglas lo permiten. El índice único de
// la base cubre dos envíos simultáneos.
export async function createApplication(
  actor: Actor,
  data: ApplicationData,
): Promise<{ ok: true } | { ok: false; error: ApplicationError }> {
  const existing = await listOwnApplications(actor.id);
  const result = submitApplication({
    id: crypto.randomUUID(),
    userId: actor.id,
    userRoles: actor.roles,
    existing,
    data,
    now: new Date(),
  });
  if (!result.ok) return result;
  const inserted = await db
    .insert(applications)
    .values({
      id: result.application.id,
      userId: actor.id,
      kind: data.kind,
      data,
    })
    .onConflictDoNothing()
    .returning({ id: applications.id });
  return inserted.length ? { ok: true } : { ok: false, error: "already_pending" };
}

export type ApplicationWithUser = {
  application: Application;
  user: { name: string; email: string; photoUrl: string | null };
};

async function listWithUser(pending: boolean, limit: number) {
  const rows = await db
    .select({
      application: applications,
      name: users.name,
      email: users.email,
      photoUrl: users.photoUrl,
    })
    .from(applications)
    .innerJoin(users, eq(users.id, applications.userId))
    .where(
      pending
        ? eq(applications.status, "pending")
        : ne(applications.status, "pending"),
    )
    .orderBy(
      pending ? applications.submittedAt : desc(applications.decidedAt),
    )
    .limit(limit);
  return rows.flatMap((r): ApplicationWithUser[] => {
    const application = toApplication(r.application);
    return application
      ? [{ application, user: { name: r.name, email: r.email, photoUrl: r.photoUrl } }]
      : [];
  });
}

// VA-06: pendientes, de la más antigua a la más nueva.
export const listPendingApplications = () => listWithUser(true, 100);
// VA-06: últimas decididas, para tener historial a mano.
export const listRecentlyDecidedApplications = () => listWithUser(false, 20);

// RN-024 y RN-043: aprueba o rechaza dentro de una transacción. Bloquea la
// postulación y al postulante (FOR UPDATE) para que dos decisiones
// simultáneas no se pisen, y aplica las reglas de postulaciones.ts.
export async function decideApplicationInDb(input: {
  applicationId: string;
  decision: "approve" | "reject";
  decider: Actor;
}): Promise<{ ok: true } | { ok: false; error: ApplicationError | "not_found" }> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select()
      .from(applications)
      .where(eq(applications.id, input.applicationId))
      .for("update");
    const application = row ? toApplication(row) : null;
    if (!application) return { ok: false, error: "not_found" };

    const [applicant] = await tx
      .select({ roles: users.roles })
      .from(users)
      .where(eq(users.id, application.userId))
      .for("update");
    if (!applicant) return { ok: false, error: "not_found" };

    const now = new Date();
    let newRoles: Role[] | null = null;
    let decided: Application;
    if (input.decision === "approve") {
      const r = approveApplication({
        application,
        applicantRoles: knownRoles(applicant.roles),
        decider: input.decider,
        now,
      });
      if (!r.ok) return r;
      decided = r.application;
      newRoles = r.roles;
    } else {
      const r = rejectApplication({ application, decider: input.decider, now });
      if (!r.ok) return r;
      decided = r.application;
    }

    await tx
      .update(applications)
      .set({
        status: decided.status,
        decidedAt: now,
        decidedBy: input.decider.id,
      })
      .where(
        and(
          eq(applications.id, application.id),
          eq(applications.status, "pending"),
        ),
      );
    if (newRoles) {
      await tx
        .update(users)
        .set({ roles: newRoles })
        .where(eq(users.id, application.userId));
    }
    return { ok: true };
  });
}
