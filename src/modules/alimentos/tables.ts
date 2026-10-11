import { index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { users } from "@/modules/usuarios/tables";

// RN-032: lista única de alimentos. `normalized` (normalizeFoodName) es único:
// "Zanahoria" y "zanahoria " son el mismo alimento. RLS activado y sin
// políticas (DT-029).
export const foods = pgTable(
  "foods",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    normalized: text("normalized").notNull(),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("foods_normalized_unique").on(t.normalized)],
).enableRLS();

// Sinónimos: "pechuga de pollo" → pollo. También quedan como sinónimos los
// nombres de los alimentos que se unen a otro, así lo escrito antes sigue
// encontrándolo.
export const foodAliases = pgTable(
  "food_aliases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    foodId: uuid("food_id")
      .notNull()
      .references(() => foods.id, { onDelete: "cascade" }),
    alias: text("alias").notNull(),
    normalized: text("normalized").notNull(),
  },
  (t) => [uniqueIndex("food_aliases_normalized_unique").on(t.normalized), index("food_aliases_food_idx").on(t.foodId)],
).enableRLS();
