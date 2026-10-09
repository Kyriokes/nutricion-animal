import { and, asc, count, desc, eq, inArray, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { products } from "@/modules/catalogo/tables";
import type { Address } from "@/modules/usuarios/direcciones";
import { getAddress } from "@/modules/usuarios/repositorio";
import { planOrder, type CheckoutError, type CheckoutInput } from "./checkout";
import { CARRIER, DEFAULT_SHIPPING_COST } from "./envio";
import {
  canTransition,
  isReservationExpired,
  releasesStock,
  reservationDeadline,
  type OrderActor,
  type OrderStatus,
} from "./estados";
import { orderItems, orders, orderStatusChanges, shopSettings } from "./tables";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// RN-068: costo fijo de envío vigente. Si el admin nunca lo cargó, el de prueba.
export async function getShippingCost(): Promise<number> {
  const [row] = await db.select({ cost: shopSettings.shippingCost }).from(shopSettings);
  return row?.cost ?? DEFAULT_SHIPPING_COST;
}

// VA-08: el admin cambia el costo de envío. Rige para los pedidos nuevos; los
// ya creados conservan el que tenían.
export async function saveShippingCost(cost: number, userId: string) {
  await db
    .insert(shopSettings)
    .values({ id: 1, shippingCost: cost, updatedBy: userId })
    .onConflictDoUpdate({
      target: shopSettings.id,
      set: { shippingCost: cost, updatedBy: userId, updatedAt: sql`now()` },
    });
}

// Aplica un cambio de estado ya validado sobre un pedido bloqueado: lo
// registra en el historial y, si corresponde, devuelve el stock (RN-064).
async function applyTransition(
  tx: Tx,
  orderId: string,
  to: OrderStatus,
  actor: OrderActor,
  by: string | null,
  extra: { paymentRef?: string } = {},
) {
  await tx
    .update(orders)
    .set({ status: to, updatedAt: sql`now()`, ...extra })
    .where(eq(orders.id, orderId));
  if (releasesStock(to)) {
    // SQL directo (DT-002): devuelve todo el stock del pedido en una sola
    // sentencia. Los productos borrados (product_id nulo) se saltean.
    await tx.execute(sql`
      update ${products} p
      set stock = p.stock + oi.quantity, updated_at = now()
      from ${orderItems} oi
      where oi.order_id = ${orderId} and oi.product_id = p.id
    `);
  }
  await tx.insert(orderStatusChanges).values({ orderId, status: to, actor, changedBy: by });
}

// RN-064: cancela los pedidos cuya reserva venció sin pago y devuelve su
// stock. Se llama al crear pedidos y al leerlos, así no hace falta un
// proceso programado. Los pedidos que otro está cambiando se saltean.
async function expireOverdue(tx: Tx) {
  const overdue = await tx
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.status, "pending_payment"), lte(orders.reservedUntil, sql`now()`)))
    .for("update", { skipLocked: true });
  for (const o of overdue) await applyTransition(tx, o.id, "cancelled", "system", null);
}

export async function expireOverdueOrders() {
  await db.transaction((tx) => expireOverdue(tx));
}

export type CreateOrderResult =
  | { ok: true; orderId: string }
  | { ok: false; error: CheckoutError | "address_not_found" };

// VP-08, RN-064: crea el pedido y reserva el stock. Los productos se bloquean
// (FOR UPDATE, en orden de id para no trabarse con otra compra) para que dos
// compras simultáneas no se lleven la misma última unidad.
export async function createOrder(customerId: string, input: CheckoutInput): Promise<CreateOrderResult> {
  const address = await getAddress(customerId, input.addressId);
  if (!address) return { ok: false, error: "address_not_found" };
  const shippingCost = await getShippingCost();

  return db.transaction(async (tx) => {
    await expireOverdue(tx);
    const available = await tx
      .select({ id: products.id, name: products.name, price: products.price, stock: products.stock })
      .from(products)
      .where(
        and(
          inArray(
            products.id,
            input.lines.map((l) => l.productId),
          ),
          eq(products.status, "approved"),
        ),
      )
      .orderBy(asc(products.id))
      .for("update");

    const plan = planOrder({
      lines: input.lines,
      products: available,
      address,
      shippingCost,
      expectedTotal: input.expectedTotal,
    });
    if (!plan.ok) return plan;

    const deliveryAddress: Address = {
      city: address.city,
      street: address.street,
      number: address.number,
      ...(address.floor ? { floor: address.floor } : {}),
      ...(address.apartment ? { apartment: address.apartment } : {}),
    };
    const [order] = await tx
      .insert(orders)
      .values({
        customerId,
        deliveryAddress,
        carrier: CARRIER,
        subtotal: plan.subtotal,
        shippingCost: plan.shippingCost,
        total: plan.total,
        reservedUntil: reservationDeadline(new Date()),
      })
      .returning({ id: orders.id });
    await tx.insert(orderItems).values(
      plan.items.map((i) => ({
        orderId: order.id,
        productId: i.productId,
        productName: i.name,
        unitPrice: i.unitPrice,
        quantity: i.quantity,
      })),
    );
    for (const i of plan.items) {
      await tx
        .update(products)
        .set({ stock: sql`${products.stock} - ${i.quantity}`, updatedAt: sql`now()` })
        .where(eq(products.id, i.productId));
    }
    await tx
      .insert(orderStatusChanges)
      .values({ orderId: order.id, status: "pending_payment", actor: "customer", changedBy: customerId });
    return { ok: true as const, orderId: order.id };
  });
}

export type TransitionError = "not_found" | "expired" | "invalid_transition";

// RN-065: cambia el estado de un pedido si quien lo pide puede hacerlo. Con
// `customerId`, solo sobre pedidos de ese cliente. Si la reserva ya venció,
// primero lo cancela (RN-064) y avisa.
async function transitionOrder(
  orderId: string,
  to: OrderStatus,
  actor: OrderActor,
  opts: { customerId?: string; by: string | null; paymentRef?: string },
): Promise<{ ok: true } | { ok: false; error: TransitionError }> {
  return db.transaction(async (tx) => {
    const [order] = await tx
      .select({ status: orders.status, reservedUntil: orders.reservedUntil, customerId: orders.customerId })
      .from(orders)
      .where(eq(orders.id, orderId))
      .for("update");
    if (!order || (opts.customerId && order.customerId !== opts.customerId)) {
      return { ok: false as const, error: "not_found" as const };
    }
    const status = order.status as OrderStatus;
    if (isReservationExpired({ status, reservedUntil: order.reservedUntil }, new Date())) {
      await applyTransition(tx, orderId, "cancelled", "system", null);
      return { ok: false as const, error: "expired" as const };
    }
    if (!canTransition(status, to, actor)) return { ok: false as const, error: "invalid_transition" as const };
    await applyTransition(tx, orderId, to, actor, opts.by, opts.paymentRef ? { paymentRef: opts.paymentRef } : {});
    return { ok: true as const };
  });
}

// VU-07 (simulada): el cliente prueba el pago de su pedido. Quien informa el
// resultado es la "pasarela"; en la parte 6 lo hará Mercado Pago (RN-067).
export function simulatePayment(customerId: string, orderId: string, approved: boolean) {
  return transitionOrder(orderId, approved ? "paid" : "rejected", "gateway", {
    customerId,
    by: null,
    ...(approved ? { paymentRef: `simulado-${crypto.randomUUID()}` } : {}),
  });
}

// RN-065: el cliente cancela su pedido antes del envío.
export function cancelOrderByCustomer(customerId: string, orderId: string) {
  return transitionOrder(orderId, "cancelled", "customer", { customerId, by: customerId });
}

export const ORDERS_PAGE_SIZE = 10;

// VU-02: pedidos del cliente, los más nuevos primero.
export async function listCustomerOrders(customerId: string, page: number) {
  await expireOverdueOrders();
  const where = eq(orders.customerId, customerId);
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: orders.id,
        status: orders.status,
        total: orders.total,
        createdAt: orders.createdAt,
        items: sql<number>`(select coalesce(sum(${orderItems.quantity}), 0)::int from ${orderItems} where ${orderItems.orderId} = ${orders.id})`,
      })
      .from(orders)
      .where(where)
      .orderBy(desc(orders.createdAt), desc(orders.id))
      .limit(ORDERS_PAGE_SIZE)
      .offset((page - 1) * ORDERS_PAGE_SIZE),
    db.select({ total: count() }).from(orders).where(where),
  ]);
  return {
    orders: rows.map((r) => ({ ...r, status: r.status as OrderStatus })),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / ORDERS_PAGE_SIZE)),
  };
}

// VU-10, VU-02: un pedido del cliente con sus productos y su seguimiento.
export async function getCustomerOrder(customerId: string, orderId: string) {
  await expireOverdueOrders();
  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.customerId, customerId)));
  if (!order) return null;
  const [items, history] = await Promise.all([
    db
      .select({
        productId: orderItems.productId,
        name: orderItems.productName,
        unitPrice: orderItems.unitPrice,
        quantity: orderItems.quantity,
      })
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId))
      .orderBy(asc(orderItems.productName)),
    db
      .select({ status: orderStatusChanges.status, createdAt: orderStatusChanges.createdAt })
      .from(orderStatusChanges)
      .where(eq(orderStatusChanges.orderId, orderId))
      .orderBy(asc(orderStatusChanges.createdAt)),
  ]);
  return {
    ...order,
    status: order.status as OrderStatus,
    items,
    history: history.map((h) => ({ ...h, status: h.status as OrderStatus })),
  };
}

export type CustomerOrder = NonNullable<Awaited<ReturnType<typeof getCustomerOrder>>>;
