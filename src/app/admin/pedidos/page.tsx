import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { NoAccess } from "@/components/no-access";
import { Pager } from "@/components/pager";
import { formatPrice } from "@/modules/catalogo/presentacion";
import { ORDER_STATUSES, STATUS_LABELS } from "@/modules/pedidos/estados";
import { AdminOrderFilterSchema, statusesFor, type OrderFilter } from "@/modules/pedidos/filtros";
import { orderNumber } from "@/modules/pedidos/presentacion";
import { listAllOrders } from "@/modules/pedidos/repositorio";
import { hasPermission } from "@/modules/usuarios/roles";
import { getCurrentActor } from "@/modules/usuarios/sesion";

const dateTime = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Argentina/Buenos_Aires",
});

const FILTER_LABELS: Record<OrderFilter, string> = {
  pendientes: "Pendientes",
  todos: "Todos",
  ...STATUS_LABELS,
};
const FILTERS: OrderFilter[] = ["pendientes", "todos", ...ORDER_STATUSES];

const hrefFor = (estado: OrderFilter, pagina = 1) =>
  `/admin/pedidos?estado=${estado}${pagina > 1 ? `&pagina=${pagina}` : ""}`;

// VA-04: gestión de pedidos (RN-061). Por defecto, los pendientes (RN-090).
async function Content({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  const actor = await getCurrentActor();
  if (!actor || !hasPermission(actor.roles, "order.view_all")) return <NoAccess />;
  const filter = AdminOrderFilterSchema.parse(await searchParams);
  const result = await listAllOrders(statusesFor(filter.estado), filter.pagina);

  return (
    <div className="flex flex-col gap-4">
      <nav aria-label="Filtrar por estado" className="flex flex-wrap gap-2 text-sm">
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={hrefFor(f)}
            aria-current={f === filter.estado ? "page" : undefined}
            className={
              f === filter.estado
                ? "rounded-full bg-primary px-3 py-1 text-primary-foreground"
                : "rounded-full border px-3 py-1 hover:bg-muted"
            }
          >
            {FILTER_LABELS[f]}
          </Link>
        ))}
      </nav>

      <p className="text-sm text-muted-foreground">
        {result.total} pedido{result.total === 1 ? "" : "s"}
      </p>
      {result.orders.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-2 pr-3 font-normal">Pedido</th>
                <th className="py-2 pr-3 font-normal">Fecha</th>
                <th className="py-2 pr-3 font-normal">Cliente</th>
                <th className="py-2 pr-3 font-normal">Estado</th>
                <th className="py-2 text-right font-normal">Total</th>
              </tr>
            </thead>
            <tbody>
              {result.orders.map((o) => (
                <tr key={o.id} className="border-t">
                  <td className="py-2 pr-3">
                    <Link href={`/admin/pedidos/${o.id}`} className="font-medium underline-offset-4 hover:underline">
                      {orderNumber(o.id)}
                    </Link>
                  </td>
                  <td className="py-2 pr-3 whitespace-nowrap">{dateTime.format(o.createdAt)}</td>
                  <td className="py-2 pr-3">
                    {o.customerName}
                    <span className="block text-xs text-muted-foreground">{o.customerEmail}</span>
                  </td>
                  <td className="py-2 pr-3">{STATUS_LABELS[o.status]}</td>
                  <td className="py-2 text-right whitespace-nowrap">{formatPrice(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager page={result.page} pages={result.pages} hrefFor={(n) => hrefFor(filter.estado, n)} />
    </div>
  );
}

export default function AdminOrdersPage({ searchParams }: PageProps<"/admin/pedidos">) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-semibold">Pedidos</h1>
      <Suspense fallback={<p className="text-muted-foreground">Cargando…</p>}>
        <Content searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
