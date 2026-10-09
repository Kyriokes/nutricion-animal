import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { z } from "zod";
import { NoAccess } from "@/components/no-access";
import { OrderSummary } from "@/components/order-summary";
import { STATUS_LABELS } from "@/modules/pedidos/estados";
import { adminActions } from "@/modules/pedidos/filtros";
import { changedByLabel, orderNumber } from "@/modules/pedidos/presentacion";
import { getOrderForAdmin, listOrderClaims } from "@/modules/pedidos/repositorio";
import { ClaimList } from "@/components/claim-list";
import { hasPermission } from "@/modules/usuarios/roles";
import { getCurrentActor } from "@/modules/usuarios/sesion";
import { AdminOrderActions } from "../order-actions";

const dateTime = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Argentina/Buenos_Aires",
});

// VA-04: detalle de un pedido para el admin (RN-061) y cambio de estado (RN-065).
async function Content({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const actor = await getCurrentActor();
  if (!actor || !hasPermission(actor.roles, "order.view_all")) return <NoAccess />;
  const id = z.uuid().safeParse((await params).id);
  const order = id.success ? await getOrderForAdmin(id.data) : null;
  if (!order) return <p className="text-muted-foreground">No encontramos ese pedido.</p>;
  const claims = await listOrderClaims(order.id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Pedido {orderNumber(order.id)}</h1>
        <p className="text-sm">
          Estado: <strong>{STATUS_LABELS[order.status]}</strong>
        </p>
        <p className="text-sm text-muted-foreground">
          {order.customer.name} · {order.customer.email}
        </p>
        {order.paymentRef && <p className="text-xs text-muted-foreground">Referencia de pago: {order.paymentRef}</p>}
      </div>

      {hasPermission(actor.roles, "order.manage") && (
        <AdminOrderActions orderId={order.id} actions={adminActions(order.status)} />
      )}

      <OrderSummary order={order} />

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">Seguimiento</h2>
        <ol className="flex flex-col gap-1 text-sm">
          {order.history.map((h, n) => (
            <li key={n} className="flex flex-wrap gap-2">
              <span className="font-medium">{STATUS_LABELS[h.status]}</span>
              <span className="text-muted-foreground">{dateTime.format(h.createdAt)}</span>
              <span className="text-muted-foreground">· {changedByLabel(h)}</span>
            </li>
          ))}
        </ol>
      </section>

      {claims.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-medium">Reclamos</h2>
          <ClaimList claims={claims} hrefFor={(id) => `/admin/reclamos/${id}`} />
        </section>
      )}
    </div>
  );
}

export default function AdminOrderPage({ params }: PageProps<"/admin/pedidos/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <Link href="/admin/pedidos" className="text-sm underline-offset-4 hover:underline">
        ← Pedidos
      </Link>
      <Suspense fallback={<p className="text-muted-foreground">Cargando…</p>}>
        <Content params={params} />
      </Suspense>
    </main>
  );
}
