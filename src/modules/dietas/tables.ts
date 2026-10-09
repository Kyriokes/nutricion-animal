import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { pets } from "@/modules/mascotas/tables";
import { users } from "@/modules/usuarios/tables";

// RN-021: cada nutricionista tiene sus propias dietas. El nombre vive en la
// dieta y no se versiona (DT-025). RLS activado y sin políticas (DT-029).
export const diets = pgTable(
  "diets",
  {
    id: uuid("id").primaryKey(),
    // RN-047: si se borra la cuenta del nutricionista, la dieta queda sin
    // autor (null) y los clientes la siguen viendo, con un aviso.
    nutritionistId: uuid("nutritionist_id").references(() => users.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("diets_nutritionist_idx").on(t.nutritionistId)],
).enableRLS();

// RN-025: versiones numeradas; `content` es DietContent (descripción,
// alimentos, duración, notas), validado con DietContentSchema.
export const dietVersions = pgTable(
  "diet_versions",
  {
    id: uuid("id").primaryKey(),
    dietId: uuid("diet_id")
      .notNull()
      .references(() => diets.id, { onDelete: "cascade" }),
    number: integer("number").notNull(),
    content: jsonb("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (t) => [uniqueIndex("diet_versions_number_unique").on(t.dietId, t.number)],
).enableRLS();

// RN-023: una mascota tiene asignada una versión concreta. Las asignaciones
// terminadas se conservan con `ended_at` (historial, DT-026). Una versión con
// asignaciones no se puede borrar (restrict).
export const dietAssignments = pgTable(
  "diet_assignments",
  {
    id: uuid("id").primaryKey(),
    petId: uuid("pet_id")
      .notNull()
      .references(() => pets.id, { onDelete: "cascade" }),
    dietVersionId: uuid("diet_version_id")
      .notNull()
      .references(() => dietVersions.id, { onDelete: "restrict" }),
    assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
  },
  (t) => [
    index("diet_assignments_pet_idx").on(t.petId),
    index("diet_assignments_version_idx").on(t.dietVersionId),
  ],
).enableRLS();
