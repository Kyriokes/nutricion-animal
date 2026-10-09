import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { NoAccess } from "@/components/no-access";
import { Pager } from "@/components/pager";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/modules/catalogo/presentacion";
import { STATUS_LABELS } from "@/modules/pedidos/estados";
import { listSales, salesSummary } from "@/modules/pedidos/estadisticas";
import { orderNumber } from "@/modules/pedidos/presentacion";
import { periodRange, SalesFilterSchema, type SalesFilter } from "@/modules/pedidos/ventas";
import { hasPermission } from "@/modules/usuarios/roles";
import { getCurrentActor } from "@/modules/usuarios/sesion";

const dateTime = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Argentina/Buenos_Aires",
});

const fieldClass = "h-8 rounded-lg border border-input bg-background px-2 text-sm";

const hrefFor = (f: SalesFilter, pagina: number) =>
  `/admin/ventas?${new URLSearchParams({ periodo: f.periodo, fecha: f.fecha, mes: f.mes, pagina: String(pagina) })}`;

// RN-090: ventas, con todo el historial paginado. Abre en el día de hoy y se
// puede filtrar por día, por mes o ver todo.
async function Content({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  const actor = await getCurrentActor();
  if (!actor || !hasPermission(actor.roles, "order.view_all")) return <NoAccess />;
  const filter = SalesFilterSchema(new Date()).parse(await searchParams);
  const range = periodRange(filter);
  const summary = await salesSummary(range);
  const result = await listSales(range, filter.pagina, summary.count);

  return (
    <div className="flex flex-col gap-4">
      {/* Formulario GET: el filtro queda en la URL y funciona sin JavaScript. */}
      <form className="flex flex-wrap items-end gap-3" action="/admin/ventas">
        <label className="flex flex-col gap-1 text-sm">
          Período
          <select name="periodo" defaultValue={filter.periodo} className={fieldClass}>
            <option value="dia">Un día</option>
            <option value="mes">Un mes</option>
            <option value="todo">Todo</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Día
          <input type="date" name="fecha" defaultValue={filter.fecha} className={fieldClass} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Mes
          <input type="month" name="mes" defaultValue={filter.mes} className={fieldClass} />
        </label>
        <Button type="submit">Ver</Button>
        <Link href="/admin/ventas" className="text-sm underline underline-offset-4">
          Hoy
        </Link>
      </form>

      <p className="text-lg">
        {summary.count} venta{summary.count === 1 ? "" : "s"} ·{" "}
        <span className="font-semibold">{formatPrice(summary.total)}</span>
      </p>

      {result.sales.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="py-2 pr-3 font-normal">Pedido</th>
                <th className="py-2 pr-3 font-normal">Pagado</th>
                <th className="py-2 pr-3 font-normal">Cliente</th>
                <th className="py-2 pr-3 font-normal">Estado</th>
                <th className="py-2 text-right font-normal">Total</th>
              </tr>
            </thead>
            <tbody>
              {result.sales.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="py-2 pr-3">
                    <Link href={`/admin/pedidos/${s.id}`} className="font-medium underline-offset-4 hover:underline">
                      {orderNumber(s.id)}
                    </Link>
                  </td>
                  <td className="py-2 pr-3 whitespace-nowrap">{dateTime.format(s.paidAt)}</td>
                  <td className="py-2 pr-3">{s.customerName}</td>
                  <td className="py-2 pr-3">{STATUS_LABELS[s.status]}</td>
                  <td className="py-2 text-right whitespace-nowrap">{formatPrice(s.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager page={result.page} pages={result.pages} hrefFor={(n) => hrefFor(filter, n)} />
    </div>
  );
}

export default function SalesPage({ searchParams }: PageProps<"/admin/ventas">) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-semibold">Ventas</h1>
      <Suspense fallback={<p className="text-muted-foreground">Cargando…</p>}>
        <Content searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
