import { sql } from "drizzle-orm";
import {
  check,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
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

// RN-024: postulaciones a nutricionista o proveedor. `data` guarda los datos
// del formulario (validados con ApplicationDataSchema). El índice único
// parcial garantiza en la base una sola postulación pendiente por tipo y
// usuario, aunque lleguen dos pedidos a la vez.
export const applications = pgTable(
  "applications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    data: jsonb("data").notNull(),
    status: text("status").notNull().default("pending"),
    submittedAt: timestamp("submitted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    decidedBy: uuid("decided_by").references(() => users.id, {
      onDelete: "set null",
    }),
  },
  (t) => [
    check("applications_kind_valid", sql`${t.kind} in ('nutritionist', 'supplier')`),
    check(
      "applications_status_valid",
      sql`${t.status} in ('pending', 'approved', 'rejected')`,
    ),
    index("applications_user_idx").on(t.userId),
    uniqueIndex("applications_one_pending_per_kind")
      .on(t.userId, t.kind)
      .where(sql`${t.status} = 'pending'`),
  ],
).enableRLS();
