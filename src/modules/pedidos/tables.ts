import { sql } from "drizzle-orm";
import { check, numeric, pgTable, smallint, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "@/modules/usuarios/tables";

// RN-068, VA-08: configuración de la tienda. Una sola fila (id = 1); por ahora
// solo el costo fijo de envío. RLS activado y sin políticas (DT-029).
export const shopSettings = pgTable(
  "shop_settings",
  {
    id: smallint("id").primaryKey().default(1),
    shippingCost: numeric("shipping_cost", { precision: 12, scale: 2, mode: "number" }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
  },
  (t) => [
    check("shop_settings_single_row", sql`${t.id} = 1`),
    check("shop_settings_shipping_cost_positive", sql`${t.shippingCost} > 0`),
  ],
).enableRLS();
