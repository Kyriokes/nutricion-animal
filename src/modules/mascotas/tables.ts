import { sql } from "drizzle-orm";
import {
  date,
  doublePrecision,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "@/modules/usuarios/tables";

const list = (name: string) =>
  text(name).array().notNull().default(sql`'{}'::text[]`);

// RN-010: mascotas de cada cliente. RLS activado y sin políticas (DT-029).
export const pets = pgTable(
  "pets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    // Texto libre con sugerencias de las ya cargadas (DT-024).
    species: text("species").notNull(),
    breed: text("breed"),
    birthDate: date("birth_date", { mode: "date" }),
    weightKg: doublePrecision("weight_kg"),
    healthConditions: list("health_conditions"),
    allergies: list("allergies"),
    forbiddenFoods: list("forbidden_foods"),
    requiredFoods: list("required_foods"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("pets_owner_idx").on(t.ownerId)],
).enableRLS();
