import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { z } from "zod";
import { formatPrice } from "@/modules/catalogo/presentacion";
import { simulatedPaymentsEnabled } from "@/modules/pedidos/pago";
import { orderNumber } from "@/modules/pedidos/presentacion";
import { hasPermission } from "@/modules/usuarios/roles";
import { getCustomerOrder } from "@/modules/pedidos/repositorio";
import { getCurrentActor } from "@/modules/usuarios/sesion";
import { SimulatedPaymentButtons } from "../../order-buttons";
import { OrderSummary } from "@/components/order-summary";

const time = new Intl.DateTimeFormat("es-AR", {
  timeStyle: "short",
  timeZone: "America/Argentina/Buenos_Aires",
});

// VU-07 (simulada): pagar el pedido. En la parte 6 se reemplaza por Mercado
// Pago (RN-067); mientras tanto, dos botones de prueba.
async function Content({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const actor = await getCurrentActor();
  const id = z.uuid().safeParse((await params).id);
  const order =
    actor && hasPermission(actor.roles, "order.view_own") && id.success
      ? await getCustomerOrder(actor.id, id.data)
      : null;
  if (!order) return <p className="text-muted-foreground">No encontramos ese pedido.</p>;
  // Ya pagado, rechazado o cancelado: se ve el resultado.
  if (order.status !== "pending_payment") redirect(`/pedidos/${order.id}`);

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm">
        Pedido {orderNumber(order.id)} · Total <strong>{formatPrice(order.total)}</strong>. Reservamos los
        productos hasta las {time.format(order.reservedUntil)}.
      </p>
      <OrderSummary order={order} />
      <section className="flex flex-col gap-3 rounded-lg border border-dashed p-4">
        {simulatedPaymentsEnabled() ? (
          <>
            <p role="status" className="w-fit rounded bg-warning px-2 py-1 text-sm text-warning-foreground">
              Pago de prueba: no se cobra nada.
            </p>
            <SimulatedPaymentButtons orderId={order.id} />
          </>
        ) : (
          <p role="status" className="text-sm">
            El pago en línea todavía no está disponible.
          </p>
        )}
      </section>
      <Link href={`/pedidos/${order.id}`} className="text-sm underline underline-offset-4">
        Ver el pedido
      </Link>
    </div>
  );
}

export default function PayOrderPage({ params }: PageProps<"/pedidos/[id]/pagar">) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-semibold">Pagar el pedido</h1>
      <Suspense fallback={<p className="text-muted-foreground">Cargando…</p>}>
        <Content params={params} />
      </Suspense>
    </main>
  );
}
