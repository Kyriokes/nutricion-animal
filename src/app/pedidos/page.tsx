import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { z } from "zod";
import { NoAccess } from "@/components/no-access";
import { Pager } from "@/components/pager";
import { formatPrice } from "@/modules/catalogo/presentacion";
import { STATUS_LABELS } from "@/modules/pedidos/estados";
import { orderNumber } from "@/modules/pedidos/presentacion";
import { listCustomerOrders } from "@/modules/pedidos/repositorio";
import { hasPermission } from "@/modules/usuarios/roles";
import { getCurrentActor } from "@/modules/usuarios/sesion";

const date = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "medium",
  timeZone: "America/Argentina/Buenos_Aires",
});
const PageParam = z.coerce.number().int().min(1).max(10_000).catch(1);

// VU-02: historial de pedidos del cliente (RN-060).
async function Content({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  const actor = await getCurrentActor();
  if (!actor || !hasPermission(actor.roles, "order.view_own")) return <NoAccess />;
  const page = PageParam.parse((await searchParams).pagina);
  const result = await listCustomerOrders(actor.id, page);

  if (result.total === 0) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-muted-foreground">Todavía no hiciste pedidos.</p>
        <Link href="/catalogo" className="text-primary underline underline-offset-4">
          Ver el catálogo
        </Link>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-2">
        {result.orders.map((o) => (
          <li key={o.id}>
            <Link
              href={`/pedidos/${o.id}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted"
            >
              <span className="font-medium">Pedido {orderNumber(o.id)}</span>
              <span className="text-muted-foreground">{date.format(o.createdAt)}</span>
              <span>
                {o.items} {o.items === 1 ? "unidad" : "unidades"}
              </span>
              <span>{STATUS_LABELS[o.status]}</span>
              <span className="font-medium">{formatPrice(o.total)}</span>
            </Link>
          </li>
        ))}
      </ul>
      <Pager page={result.page} pages={result.pages} hrefFor={(n) => `/pedidos?pagina=${n}`} />
    </div>
  );
}

export default function OrdersPage({ searchParams }: PageProps<"/pedidos">) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-semibold">Mis pedidos</h1>
      <Suspense fallback={<p className="text-muted-foreground">Cargando…</p>}>
        <Content searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
