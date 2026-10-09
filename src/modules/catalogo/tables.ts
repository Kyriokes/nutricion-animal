import { sql } from "drizzle-orm";
import {
  check,
  doublePrecision,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "@/modules/usuarios/tables";

const tags = (name: string) => text(name).array().notNull().default(sql`'{}'::text[]`);

// RN-030 y RN-031: productos del catálogo. En la primera versión los carga el
// admin (o son de prueba), pero el modelo ya soporta que los publique un
// proveedor (`supplier_id`) y que el auditor los revise (`status`, RN-041).
// Solo los aprobados se ven en el catálogo público. RLS activado (DT-029).
export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    supplierId: uuid("supplier_id").references(() => users.id, { onDelete: "set null" }),
    // Por defecto "pending": cualquier alta que no indique el estado queda
    // sin publicar hasta que la revisen (RN-041). El admin publica explícito.
    status: text("status").notNull().default("pending"),
    reviewNote: text("review_note"),
    name: text("name").notNull(),
    description: text("description").notNull(),
    price: numeric("price", { precision: 12, scale: 2, mode: "number" }).notNull(),
    brand: text("brand").notNull(),
    weightValue: doublePrecision("weight_value").notNull(),
    weightUnit: text("weight_unit").notNull(),
    volumeValue: doublePrecision("volume_value"),
    volumeUnit: text("volume_unit"),
    imageUrl: text("image_url"),
    stock: integer("stock").notNull().default(0),
    petTypes: tags("pet_types"),
    dietTypes: tags("diet_types"),
    nutritionalInfo: jsonb("nutritional_info"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("products_status_valid", sql`${t.status} in ('pending', 'approved', 'rejected')`),
    check("products_stock_non_negative", sql`${t.stock} >= 0`),
    check("products_price_positive", sql`${t.price} > 0`),
    // Filtros del catálogo por especie y tipo de dieta (RN-013, RN-014).
    index("products_pet_types_idx").using("gin", t.petTypes),
    index("products_diet_types_idx").using("gin", t.dietTypes),
    index("products_status_idx").on(t.status),
  ],
).enableRLS();
