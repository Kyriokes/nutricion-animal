import { and, asc, count, desc, eq, inArray, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { pageWithin } from "@/lib/paginas";
import { products } from "@/modules/catalogo/tables";
import type { Address } from "@/modules/usuarios/direcciones";
import { getAddress } from "@/modules/usuarios/repositorio";
import { users } from "@/modules/usuarios/tables";
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
import {
  canChangeClaim,
  canOpenClaim,
  type ClaimStatus,
  needsRefundClaim,
  REFUND_CLAIM_DESCRIPTION,
  type OpenClaimError,
  type Resolution,
} from "./reclamos";
import { claims, orderItems, orders, orderStatusChanges, shopSettings } from "./tables";

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

// Bloquea, en orden de id, los productos de estos pedidos. Toda transacción
// que toca stock toma sus productos de una sola vez y en el mismo orden (igual
// que createOrder): así dos transacciones no pueden esperarse en círculo
// (deadlock).
async function lockProductsOf(tx: Tx, orderIds: readonly string[]) {
  if (orderIds.length === 0) return;
  await tx.execute(sql`
    select p.id from ${products} p
    where p.id in (
      select oi.product_id from ${orderItems} oi
      where oi.order_id in (${sql.join(
        orderIds.map((id) => sql`${id}`),
        sql`, `,
      )})
    )
    order by p.id
    for update
  `);
}

// Aplica un cambio de estado ya validado sobre un pedido bloqueado: lo
// registra en el historial y, si corresponde, devuelve el stock (RN-064).
// Si devuelve stock, quien llama ya bloqueó los productos (lockProductsOf).
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
      set stock = p.stock + oi.quantity
      from ${orderItems} oi
      where oi.order_id = ${orderId} and oi.product_id = p.id
    `);
  }
  await tx.insert(orderStatusChanges).values({ orderId, status: to, actor, changedBy: by });
}

// RN-064: cancela los pedidos cuya reserva venció sin pago y devuelve su
// stock. Se llama al crear pedidos (todos) y al leerlos (solo los de ese
// cliente), así no hace falta un proceso programado. Los pedidos que otro
// está cambiando se saltean.
export async function expireOverdueOrders(customerId?: string) {
  await db.transaction(async (tx) => {
    const overdue = await tx
      .select({ id: orders.id })
      .from(orders)
      .where(
        and(
          eq(orders.status, "pending_payment"),
          lte(orders.reservedUntil, sql`now()`),
          customerId ? eq(orders.customerId, customerId) : undefined,
        ),
      )
      .for("update", { skipLocked: true });
    await lockProductsOf(
      tx,
      overdue.map((o) => o.id),
    );
    for (const o of overdue) await applyTransition(tx, o.id, "cancelled", "system", null);
  });
}

// Al leer, vencer reservas es un extra: si falla, se muestra igual lo que
// hay. Sin `customerId`, las de todos (lo que ve el admin).
async function tryExpireOverdue(customerId?: string) {
  try {
    await expireOverdueOrders(customerId);
  } catch {
    // Se reintenta en la próxima lectura o compra.
  }
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
  // Primero se liberan las reservas vencidas, en su propia transacción: así
  // esta solo bloquea sus productos, de una vez y en orden. Si falla, la
  // compra sigue con el stock que haya.
  try {
    await expireOverdueOrders();
  } catch {
    // Se reintenta en la próxima compra.
  }

  return db.transaction(async (tx) => {
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
        .set({ stock: sql`${products.stock} - ${i.quantity}` })
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
      await lockProductsOf(tx, [orderId]);
      await applyTransition(tx, orderId, "cancelled", "system", null);
      return { ok: false as const, error: "expired" as const };
    }
    if (!canTransition(status, to, actor)) return { ok: false as const, error: "invalid_transition" as const };
    if (releasesStock(to)) await lockProductsOf(tx, [orderId]);
    await applyTransition(tx, orderId, to, actor, opts.by, opts.paymentRef ? { paymentRef: opts.paymentRef } : {});
    // RN-066 (decisión 1a): cancelado después de pagado → reembolso pendiente,
    // en la misma transacción para que no quede uno sin el otro.
    if (needsRefundClaim(status, to)) {
      await tx.insert(claims).values({ orderId, description: REFUND_CLAIM_DESCRIPTION, origin: "system" });
    }
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
export async function listCustomerOrders(customerId: string, requestedPage: number) {
  await tryExpireOverdue(customerId);
  const where = eq(orders.customerId, customerId);
  const [{ total }] = await db.select({ total: count() }).from(orders).where(where);
  const { page, pages } = pageWithin(requestedPage, total, ORDERS_PAGE_SIZE);
  const rows = await db
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
    .offset((page - 1) * ORDERS_PAGE_SIZE);
  return {
    orders: rows.map((r) => ({ ...r, status: r.status as OrderStatus })),
    total,
    page,
    pages,
  };
}

// Un pedido con sus productos, su seguimiento y quién lo hizo. Con
// `customerId`, solo si es de ese cliente.
async function loadOrder(orderId: string, customerId?: string) {
  const [row] = await db
    .select({ order: orders, customerName: users.name, customerEmail: users.email })
    .from(orders)
    .innerJoin(users, eq(users.id, orders.customerId))
    .where(and(eq(orders.id, orderId), customerId ? eq(orders.customerId, customerId) : undefined));
  if (!row) return null;
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
      .select({
        status: orderStatusChanges.status,
        actor: orderStatusChanges.actor,
        byName: users.name,
        createdAt: orderStatusChanges.createdAt,
      })
      .from(orderStatusChanges)
      .leftJoin(users, eq(users.id, orderStatusChanges.changedBy))
      .where(eq(orderStatusChanges.orderId, orderId))
      .orderBy(asc(orderStatusChanges.createdAt)),
  ]);
  return {
    ...row.order,
    status: row.order.status as OrderStatus,
    customer: { name: row.customerName, email: row.customerEmail },
    items,
    history: history.map((h) => ({ ...h, status: h.status as OrderStatus, actor: h.actor as OrderActor })),
  };
}

export type OrderDetail = NonNullable<Awaited<ReturnType<typeof loadOrder>>>;

// VU-10, VU-02: un pedido del cliente con sus productos y su seguimiento.
export async function getCustomerOrder(customerId: string, orderId: string) {
  await tryExpireOverdue(customerId);
  return loadOrder(orderId, customerId);
}

// VA-04, RN-061: cualquier pedido, para el admin.
export async function getOrderForAdmin(orderId: string) {
  await tryExpireOverdue();
  return loadOrder(orderId);
}

// VA-04, RN-065: el admin avanza el pedido o lo cancela antes del envío.
export function transitionOrderByAdmin(adminId: string, orderId: string, to: OrderStatus) {
  return transitionOrder(orderId, to, "admin", { by: adminId });
}

export const ADMIN_ORDERS_PAGE_SIZE = 20;

// VA-04, RN-061, RN-090: todos los pedidos, los más nuevos primero, filtrados
// por estado (null = todos).
export async function listAllOrders(statuses: readonly OrderStatus[] | null, requestedPage: number) {
  await tryExpireOverdue();
  const where = statuses ? inArray(orders.status, [...statuses]) : undefined;
  const [{ total }] = await db.select({ total: count() }).from(orders).where(where);
  const { page, pages } = pageWithin(requestedPage, total, ADMIN_ORDERS_PAGE_SIZE);
  const rows = await db
    .select({
      id: orders.id,
      status: orders.status,
      total: orders.total,
      createdAt: orders.createdAt,
      customerName: users.name,
      customerEmail: users.email,
    })
    .from(orders)
    .innerJoin(users, eq(users.id, orders.customerId))
    .where(where)
    .orderBy(desc(orders.createdAt), desc(orders.id))
    .limit(ADMIN_ORDERS_PAGE_SIZE)
    .offset((page - 1) * ADMIN_ORDERS_PAGE_SIZE);
  return {
    orders: rows.map((r) => ({ ...r, status: r.status as OrderStatus })),
    total,
    page,
    pages,
  };
}

// RN-066: el cliente abre un reclamo sobre su pedido. Se bloquea el pedido
// para que el tope de reclamos no se pase con dos envíos simultáneos.
export async function openClaim(
  customerId: string,
  orderId: string,
  description: string,
): Promise<{ ok: true } | { ok: false; error: OpenClaimError | "not_found" }> {
  return db.transaction(async (tx) => {
    const [order] = await tx
      .select({ status: orders.status })
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.customerId, customerId)))
      .for("update");
    if (!order) return { ok: false as const, error: "not_found" as const };
    const [[received], [{ n }]] = await Promise.all([
      tx
        .select({ at: orderStatusChanges.createdAt })
        .from(orderStatusChanges)
        .where(and(eq(orderStatusChanges.orderId, orderId), eq(orderStatusChanges.status, "received")))
        .orderBy(desc(orderStatusChanges.createdAt))
        .limit(1),
      // El tope cuenta solo los que abrió el cliente.
      tx
        .select({ n: count() })
        .from(claims)
        .where(and(eq(claims.orderId, orderId), eq(claims.origin, "customer"))),
    ]);
    const check = canOpenClaim(
      { status: order.status as OrderStatus, receivedAt: received?.at ?? null, claims: n },
      new Date(),
    );
    if (!check.ok) return check;
    await tx.insert(claims).values({ orderId, description });
    return { ok: true as const };
  });
}

const toClaim = (c: typeof claims.$inferSelect) => ({
  ...c,
  origin: c.origin as "customer" | "system",
  status: c.status as ClaimStatus,
  resolution: c.resolution as Resolution | null,
});

// RN-066: reclamos de un pedido, los más viejos primero.
export async function listOrderClaims(orderId: string) {
  const rows = await db.select().from(claims).where(eq(claims.orderId, orderId)).orderBy(asc(claims.createdAt));
  return rows.map(toClaim);
}

export const CLAIMS_PAGE_SIZE = 20;

// RN-066, RN-090: reclamos para el admin, los más nuevos primero.
export async function listClaims(statuses: readonly ClaimStatus[] | null, requestedPage: number) {
  const where = statuses ? inArray(claims.status, [...statuses]) : undefined;
  const [{ total }] = await db.select({ total: count() }).from(claims).where(where);
  const { page, pages } = pageWithin(requestedPage, total, CLAIMS_PAGE_SIZE);
  const rows = await db
    .select({
      id: claims.id,
      orderId: claims.orderId,
      status: claims.status,
      description: claims.description,
      createdAt: claims.createdAt,
      customerName: users.name,
    })
    .from(claims)
    .innerJoin(orders, eq(orders.id, claims.orderId))
    .innerJoin(users, eq(users.id, orders.customerId))
    .where(where)
    .orderBy(desc(claims.createdAt), desc(claims.id))
    .limit(CLAIMS_PAGE_SIZE)
    .offset((page - 1) * CLAIMS_PAGE_SIZE);
  return {
    claims: rows.map((r) => ({ ...r, status: r.status as ClaimStatus })),
    total,
    page,
    pages,
  };
}

// RN-066: un reclamo con su pedido y su cliente, para el admin.
export async function getClaimForAdmin(claimId: string) {
  const [row] = await db
    .select({ claim: claims, customerName: users.name, customerEmail: users.email, orderStatus: orders.status })
    .from(claims)
    .innerJoin(orders, eq(orders.id, claims.orderId))
    .innerJoin(users, eq(users.id, orders.customerId))
    .where(eq(claims.id, claimId));
  if (!row) return null;
  return {
    ...toClaim(row.claim),
    customer: { name: row.customerName, email: row.customerEmail },
    orderStatus: row.orderStatus as OrderStatus,
  };
}

// RN-066: el admin pasa el reclamo a revisión o lo resuelve.
export async function changeClaim(
  adminId: string,
  claimId: string,
  change: { to: "in_review" } | { to: "resolved"; resolution: Resolution; note?: string },
): Promise<{ ok: true } | { ok: false; error: "not_found" | "invalid_transition" }> {
  return db.transaction(async (tx) => {
    const [claim] = await tx.select({ status: claims.status }).from(claims).where(eq(claims.id, claimId)).for("update");
    if (!claim) return { ok: false as const, error: "not_found" as const };
    if (!canChangeClaim(claim.status as ClaimStatus, change.to)) {
      return { ok: false as const, error: "invalid_transition" as const };
    }
    await tx
      .update(claims)
      .set(
        change.to === "resolved"
          ? {
              status: "resolved",
              resolution: change.resolution,
              resolutionNote: change.note ?? null,
              resolvedBy: adminId,
              resolvedAt: sql`now()`,
              updatedAt: sql`now()`,
            }
          : { status: "in_review", updatedAt: sql`now()` },
      )
      .where(eq(claims.id, claimId));
    return { ok: true as const };
  });
}
