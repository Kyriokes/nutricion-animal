import { sql } from "drizzle-orm";
import { check, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { authUsers } from "drizzle-orm/supabase";

// Usuarios del sistema. El id es el de Supabase Auth (auth.users), que es
// quien guarda el ingreso con Google (RN-003). Acá vive lo nuestro: roles
// (RN-002), datos de perfil y la nota del admin (DT-021).
// RLS activado y sin políticas (DT-029): solo el servidor la lee, vía Drizzle.
export const users = pgTable(
  "users",
  {
    id: uuid("id")
      .primaryKey()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    email: text("email").notNull().unique(),
    name: text("name").notNull(),
    photoUrl: text("photo_url"),
    roles: text("roles")
      .array()
      .notNull()
      .default(sql`'{customer}'::text[]`),
    adminNote: text("admin_note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check(
      "users_roles_valid",
      sql`${t.roles} <@ array['admin','customer','nutritionist','supplier','auditor']::text[]`,
    ),
  ],
).enableRLS();
