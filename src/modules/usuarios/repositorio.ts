import { and, arrayContains, count, desc, eq, isNull, ne } from "drizzle-orm";
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
import { planUserUpdate } from "./gestion";
import {
  professionalProfileFromApplication,
  toPublicProfile,
  type ProfessionalProfile,
  type PublicProfile,
} from "./perfil-profesional";
import { RoleSchema, type Actor, type Role } from "./roles";
import { canAddAddress, type Address } from "./direcciones";
import { addresses, applications, nutritionistProfiles, users } from "./tables";

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
    ...(row.decisionNote ? { decisionNote: row.decisionNote } : {}),
    ...(row.seenAt ? { seenAt: row.seenAt } : {}),
  };
}

// RN-045: el postulante marca como leídos los resultados de sus postulaciones.
export async function markDecisionsSeen(userId: string) {
  await db
    .update(applications)
    .set({ seenAt: new Date() })
    .where(
      and(
        eq(applications.userId, userId),
        ne(applications.status, "pending"),
        isNull(applications.seenAt),
      ),
    );
}

// RN-045: cantidad de resultados sin leer, para el aviso del encabezado.
export async function countUnseenDecisions(userId: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(applications)
    .where(
      and(
        eq(applications.userId, userId),
        ne(applications.status, "pending"),
        isNull(applications.seenAt),
      ),
    );
  return row?.n ?? 0;
}

const onlyValid = (rows: ApplicationRow[]) =>
  rows.map(toApplication).filter((a): a is Application => a !== null);

const knownRoles = (roles: string[]) =>
  roles.filter((r): r is Role => RoleSchema.safeParse(r).success);

// VA-10: usuarios para la gestión del admin, los más nuevos primero.
export async function listUsers(limit = 200) {
  const rows = await db
    .select()
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(limit);
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    photoUrl: r.photoUrl,
    roles: knownRoles(r.roles),
    adminNote: r.adminNote,
    createdAt: r.createdAt,
  }));
}

// VA-10: aplica planUserUpdate dentro de una transacción, leyendo los roles
// actuales con FOR UPDATE para no pisar un cambio simultáneo.
export async function updateUserByAdmin(input: {
  actor: Actor;
  targetId: string;
  input: unknown;
}) {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .select({ id: users.id, roles: users.roles })
      .from(users)
      .where(eq(users.id, input.targetId))
      .for("update");
    if (!row) return { ok: false as const, error: "not_found" as const };
    const plan = planUserUpdate({
      actor: input.actor,
      target: { id: row.id, roles: knownRoles(row.roles) },
      input: input.input,
    });
    if (!plan.ok) return plan;
    await tx
      .update(users)
      .set({ roles: plan.update.roles, adminNote: plan.update.adminNote })
      .where(eq(users.id, row.id));
    return { ok: true as const };
  });
}

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
  // RN-044: obligatoria al rechazar.
  note?: string;
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
      const r = rejectApplication({
        application,
        decider: input.decider,
        note: input.note ?? "",
        now,
      });
      if (!r.ok) return r;
      decided = r.application;
    }

    await tx
      .update(applications)
      .set({
        status: decided.status,
        decidedAt: now,
        decidedBy: input.decider.id,
        decisionNote: decided.decisionNote ?? null,
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
      // RN-029: los datos de la postulación pasan al perfil profesional.
      const profile = professionalProfileFromApplication(decided);
      if (profile) {
        await tx
          .insert(nutritionistProfiles)
          .values({ userId: application.userId, ...profile })
          .onConflictDoUpdate({
            target: nutritionistProfiles.userId,
            set: { ...profile, updatedAt: now },
          });
      }
    }
    return { ok: true };
  });
}

// VN-05: perfil profesional propio (con la matrícula).
export async function getProfessionalProfile(
  userId: string,
): Promise<ProfessionalProfile | null> {
  const [row] = await db
    .select({
      address: nutritionistProfiles.address,
      phone: nutritionistProfiles.phone,
      licenseNumber: nutritionistProfiles.licenseNumber,
    })
    .from(nutritionistProfiles)
    .where(eq(nutritionistProfiles.userId, userId));
  return row ?? null;
}

// VN-05: guarda el perfil profesional (ya validado con planProfessionalProfileUpdate).
export async function saveProfessionalProfile(
  userId: string,
  profile: ProfessionalProfile,
) {
  await db
    .insert(nutritionistProfiles)
    .values({ userId, ...profile })
    .onConflictDoUpdate({
      target: nutritionistProfiles.userId,
      set: { ...profile, updatedAt: new Date() },
    });
}

const publicProfileColumns = {
  userId: users.id,
  name: users.name,
  photoUrl: users.photoUrl,
  address: nutritionistProfiles.address,
  phone: nutritionistProfiles.phone,
};

// VU-08: nutricionistas con perfil y con el rol vigente (un nutricionista
// bloqueado o al que le quitaron el rol no aparece). Sin la matrícula.
export async function listPublicNutritionists(): Promise<PublicProfile[]> {
  const rows = await db
    .select(publicProfileColumns)
    .from(nutritionistProfiles)
    .innerJoin(users, eq(users.id, nutritionistProfiles.userId))
    .where(arrayContains(users.roles, ["nutritionist"]))
    .orderBy(users.name);
  return rows.map(toPublicProfile);
}

// VU-09: un nutricionista, con las mismas condiciones que la lista.
export async function getPublicNutritionist(
  userId: string,
): Promise<PublicProfile | null> {
  const [row] = await db
    .select(publicProfileColumns)
    .from(nutritionistProfiles)
    .innerJoin(users, eq(users.id, nutritionistProfiles.userId))
    .where(
      and(
        eq(nutritionistProfiles.userId, userId),
        arrayContains(users.roles, ["nutritionist"]),
      ),
    );
  return row ? toPublicProfile(row) : null;
}

// RN-017: direcciones del usuario, las más nuevas primero.
export async function listAddresses(userId: string) {
  const rows = await db
    .select()
    .from(addresses)
    .where(eq(addresses.userId, userId))
    .orderBy(desc(addresses.createdAt));
  return rows.map((r) => ({
    id: r.id,
    city: r.city,
    street: r.street,
    number: r.number,
    ...(r.floor ? { floor: r.floor } : {}),
    ...(r.apartment ? { apartment: r.apartment } : {}),
  }));
}

// RN-017: agrega una dirección (ya validada con AddressSchema) si no se
// superó el máximo. La cuenta y el insert van en una transacción.
export async function addAddress(
  userId: string,
  address: Address,
): Promise<{ ok: true } | { ok: false; error: "too_many" }> {
  return db.transaction(async (tx) => {
    // Bloquea al usuario para que dos altas simultáneas no pasen el máximo.
    await tx.select({ id: users.id }).from(users).where(eq(users.id, userId)).for("update");
    const [{ n }] = await tx
      .select({ n: count() })
      .from(addresses)
      .where(eq(addresses.userId, userId));
    if (!canAddAddress(n)) return { ok: false as const, error: "too_many" as const };
    await tx.insert(addresses).values({
      userId,
      city: address.city,
      street: address.street,
      number: address.number,
      floor: address.floor ?? null,
      apartment: address.apartment ?? null,
    });
    return { ok: true as const };
  });
}

// RN-017: borra una dirección propia. El filtro por usuario impide borrar
// direcciones de otros aunque se mande otro id.
export async function deleteAddress(userId: string, addressId: string) {
  await db
    .delete(addresses)
    .where(and(eq(addresses.id, addressId), eq(addresses.userId, userId)));
}
