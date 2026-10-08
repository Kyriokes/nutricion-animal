import { eq } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/lib/db";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { planUserSync, type GoogleProfile } from "./ingreso";
import { RoleSchema, type Actor, type Role } from "./roles";
import type { User } from "./schema";
import { users } from "./tables";

function toUser(row: typeof users.$inferSelect): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    // Solo roles conocidos: un valor raro en la base no da permisos.
    roles: row.roles.filter((r): r is Role => RoleSchema.safeParse(r).success),
    ...(row.photoUrl ? { photoUrl: row.photoUrl } : {}),
    ...(row.adminNote ? { adminNote: row.adminNote } : {}),
  };
}

// Usuario de la sesión actual, o null. getClaims() verifica el token; no
// alcanza con leer la cookie. React cache() evita repetir la consulta dentro
// del mismo pedido. Lee cookies: con Cache Components, quien lo use tiene que
// estar dentro de <Suspense>.
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();
  const id = data?.claims?.sub;
  if (error || !id) return null;
  const [row] = await db.select().from(users).where(eq(users.id, id));
  return row ? toUser(row) : null;
});

// Quien ejecuta una acción, para verificar permisos (hasPermission) en cada
// Server Action y Route Handler, cerca de los datos.
export async function getCurrentActor(): Promise<Actor | null> {
  const user = await getCurrentUser();
  return user ? { id: user.id, roles: user.roles } : null;
}

// RN-024: en el primer ingreso crea el usuario como Cliente; si ya existe no
// lo toca. onConflictDoNothing cubre dos ingresos simultáneos.
export async function syncUserOnSignIn(profile: GoogleProfile): Promise<void> {
  const [row] = await db.select().from(users).where(eq(users.id, profile.id));
  const plan = planUserSync(row ? toUser(row) : null, profile);
  if (plan.action === "none") return;
  await db
    .insert(users)
    .values({
      id: plan.user.id,
      email: plan.user.email,
      name: plan.user.name,
      photoUrl: plan.user.photoUrl ?? null,
      roles: plan.user.roles,
    })
    .onConflictDoNothing();
}
