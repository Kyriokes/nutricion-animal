import { sql } from "drizzle-orm";
import {
  check,
  date,
  doublePrecision,
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { foods } from "@/modules/alimentos/tables";
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
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("pets_owner_idx").on(t.ownerId)],
).enableRLS();

// RN-036: alergias, alimentos no permitidos y de necesidad de cada mascota,
// como alimentos de la lista única (RN-032). Reemplazó a las columnas de texto
// de pets, borradas en la migración 0026 (DT-066).
export const petFoods = pgTable(
  "pet_foods",
  {
    petId: uuid("pet_id")
      .notNull()
      .references(() => pets.id, { onDelete: "cascade" }),
    foodId: uuid("food_id")
      .notNull()
      .references(() => foods.id),
    kind: text("kind").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.petId, t.foodId, t.kind] }),
    check("pet_foods_kind_valid", sql`${t.kind} in ('allergy', 'forbidden', 'required')`),
    index("pet_foods_food_idx").on(t.foodId),
  ],
).enableRLS();
