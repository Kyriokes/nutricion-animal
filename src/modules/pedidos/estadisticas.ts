import { count, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { pageWithin } from "@/lib/paginas";
import type { OrderStatus } from "./estados";
import { PENDING_STATUSES } from "./filtros";
import { claims, orderItems, orders, orderStatusChanges } from "./tables";
import { SALE_STATUSES } from "./ventas";
import { users } from "@/modules/usuarios/tables";

// Estadísticas del dashboard (VA-01, RN-090, RN-091). SQL directo y
// parametrizado (DT-002, DT-003): la base cuenta, suma y agrupa.

type Range = { from: Date; to: Date } | null;

const saleStatusesSql = sql.join(
  SALE_STATUSES.map((s) => sql`${s}`),
  sql`, `,
);

// Condición "pagado dentro del período": la fecha de la venta es la del pago.
// Las fechas van como texto ISO con conversión explícita: postgres-js no
// acepta objetos Date como parámetros en SQL directo.
const paidInRange = (range: Range) =>
  range
    ? sql`and c.created_at >= ${range.from.toISOString()}::timestamptz and c.created_at < ${range.to.toISOString()}::timestamptz`
    : sql``;

// RN-090: cantidad de ventas y monto total del período.
export async function salesSummary(range: Range): Promise<{ count: number; total: number }> {
  const result = await db.execute<{ count: number; total: string }>(sql`
    select count(*)::int as count, coalesce(sum(o.total), 0)::text as total
    from ${orders} o
    join ${orderStatusChanges} c on c.order_id = o.id and c.status = 'paid'
    where o.status in (${saleStatusesSql}) ${paidInRange(range)}
  `);
  const row = result[0];
  return { count: row?.count ?? 0, total: Number(row?.total ?? 0) };
}

export const SALES_PAGE_SIZE = 20;

// RN-090: ventas del período, las más recientes primero, paginadas. Recibe
// la cantidad total (de salesSummary) para no volver a contarlas.
export async function listSales(range: Range, requestedPage: number, total: number) {
  const { page, pages } = pageWithin(requestedPage, total, SALES_PAGE_SIZE);
  const rows = await db.execute<{
    id: string;
    status: OrderStatus;
    total: string;
    paid_at: Date;
    customer_name: string;
  }>(sql`
    select o.id, o.status, o.total::text as total, c.created_at as paid_at, u.name as customer_name
    from ${orders} o
    join ${orderStatusChanges} c on c.order_id = o.id and c.status = 'paid'
    join ${users} u on u.id = o.customer_id
    where o.status in (${saleStatusesSql}) ${paidInRange(range)}
    order by c.created_at desc, o.id desc
    limit ${SALES_PAGE_SIZE} offset ${(page - 1) * SALES_PAGE_SIZE}
  `);
  return {
    sales: rows.map((r) => ({
      id: r.id,
      status: r.status,
      total: Number(r.total),
      paidAt: new Date(r.paid_at),
      customerName: r.customer_name,
    })),
    total,
    page,
    pages,
  };
}

// RN-091: productos más vendidos (unidades), de todo el historial. Los
// productos ya borrados del catálogo no se cuentan.
export async function topSoldProducts(limit = 10) {
  const rows = await db.execute<{ product_id: string; name: string; units: number }>(sql`
    select oi.product_id, max(oi.product_name) as name, sum(oi.quantity)::int as units
    from ${orderItems} oi
    join ${orders} o on o.id = oi.order_id
    where o.status in (${saleStatusesSql}) and oi.product_id is not null
    group by oi.product_id
    order by units desc, name asc
    limit ${limit}
  `);
  return rows.map((r) => ({ productId: r.product_id, name: r.name, units: r.units }));
}

// RN-090: pedidos sin estado final y reclamos sin resolver.
export async function countPendingOrders(): Promise<number> {
  const [{ n }] = await db.select({ n: count() }).from(orders).where(inArray(orders.status, [...PENDING_STATUSES]));
  return n;
}

export async function countOpenClaims(): Promise<number> {
  const [{ n }] = await db
    .select({ n: count() })
    .from(claims)
    .where(inArray(claims.status, ["open", "in_review"]));
  return n;
}
