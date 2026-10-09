import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  smallint,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { products } from "@/modules/catalogo/tables";
import type { Address } from "@/modules/usuarios/direcciones";
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

const money = (name: string) => numeric(name, { precision: 12, scale: 2, mode: "number" });

// RN-060 a RN-065: pedidos. La dirección se copia al crear el pedido: si el
// cliente después la borra o la cambia, el pedido conserva a dónde se envió.
// Montos en pesos. RLS activado y sin políticas (DT-029).
export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => users.id),
    status: text("status").notNull().default("pending_payment"),
    deliveryAddress: jsonb("delivery_address").$type<Address>().notNull(),
    carrier: text("carrier").notNull(),
    subtotal: money("subtotal").notNull(),
    shippingCost: money("shipping_cost").notNull(),
    total: money("total").notNull(),
    // RN-064: hasta cuándo se reserva el stock esperando el pago.
    reservedUntil: timestamp("reserved_until", { withTimezone: true }).notNull(),
    // DT-004: solo una referencia del pago en la pasarela, nunca datos de tarjeta.
    paymentRef: text("payment_ref"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      "orders_status_valid",
      sql`${t.status} in ('pending_payment', 'paid', 'preparing', 'shipping', 'received', 'rejected', 'cancelled')`,
    ),
    check("orders_amounts_valid", sql`${t.subtotal} > 0 and ${t.shippingCost} >= 0 and ${t.total} = ${t.subtotal} + ${t.shippingCost}`),
    index("orders_customer_idx").on(t.customerId, t.createdAt),
    // Para encontrar rápido las reservas vencidas (RN-064).
    index("orders_status_reserved_idx").on(t.status, t.reservedUntil),
  ],
).enableRLS();

// Productos de cada pedido. Nombre y precio se copian al comprar: si después
// cambian o el producto se borra, el pedido muestra lo que se pagó.
export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    productName: text("product_name").notNull(),
    unitPrice: money("unit_price").notNull(),
    quantity: integer("quantity").notNull(),
  },
  (t) => [
    check("order_items_quantity_positive", sql`${t.quantity} > 0`),
    check("order_items_unit_price_positive", sql`${t.unitPrice} > 0`),
    index("order_items_order_idx").on(t.orderId),
  ],
).enableRLS();

// RN-062: historial de estados (el seguimiento que ve el cliente, VU-02).
export const orderStatusChanges = pgTable(
  "order_status_changes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    status: text("status").notNull(),
    actor: text("actor").notNull(),
    changedBy: uuid("changed_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("order_status_changes_actor_valid", sql`${t.actor} in ('gateway', 'customer', 'admin', 'system')`),
    index("order_status_changes_order_idx").on(t.orderId, t.createdAt),
    // Ventas por período (RN-090): se buscan los pagos por fecha.
    index("order_status_changes_status_idx").on(t.status, t.createdAt),
  ],
).enableRLS();

// RN-066: reclamos sobre un pedido, con su propio estado y una resolución al
// cerrarse. La nota de resolución la ve el cliente.
export const claims = pgTable(
  "claims",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("open"),
    description: text("description").notNull(),
    // "customer": lo abrió el cliente (cuenta para el tope). "system": lo
    // abrió el sistema, por ejemplo el reembolso al cancelar un pedido pagado.
    origin: text("origin").notNull().default("customer"),
    resolution: text("resolution"),
    resolutionNote: text("resolution_note"),
    resolvedBy: uuid("resolved_by").references(() => users.id, { onDelete: "set null" }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("claims_status_valid", sql`${t.status} in ('open', 'in_review', 'resolved')`),
    check("claims_origin_valid", sql`${t.origin} in ('customer', 'system')`),
    check("claims_resolution_valid", sql`${t.resolution} is null or ${t.resolution} in ('refund', 'resend', 'no_change')`),
    // Resuelto si y solo si tiene resolución.
    check("claims_resolved_has_resolution", sql`(${t.status} = 'resolved') = (${t.resolution} is not null)`),
    index("claims_order_idx").on(t.orderId),
    index("claims_status_idx").on(t.status, t.createdAt),
  ],
).enableRLS();
