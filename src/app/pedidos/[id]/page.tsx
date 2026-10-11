import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { z } from "zod";
import { buttonVariants } from "@/components/ui/button";
import { STATUS_LABELS } from "@/modules/pedidos/estados";
import { canCustomerCancel, orderNumber, resultMessage, type Tone } from "@/modules/pedidos/presentacion";
import { canOpenClaim, MAX_CLAIMS_PER_ORDER } from "@/modules/pedidos/reclamos";
import { paymentMode } from "@/modules/pedidos/mercadopago";
import { getPayment } from "@/modules/pedidos/mercadopago-api";
import { getCustomerOrder, isOwnOrder, listOrderClaims, processPayment } from "@/modules/pedidos/repositorio";
import { hasPermission } from "@/modules/usuarios/roles";
import { getCurrentActor } from "@/modules/usuarios/sesion";
import { ClaimList } from "@/components/claim-list";
import { CancelOrderButton, ClaimForm } from "../order-buttons";
import { OrderSummary } from "@/components/order-summary";

const dateTime = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Argentina/Buenos_Aires",
});

const TONE_CLASSES: Record<Tone, string> = {
  success: "bg-success text-success-foreground",
  warning: "bg-warning text-warning-foreground",
  error: "bg-destructive text-destructive-foreground",
  info: "bg-muted text-foreground",
};

// VU-10: resultado del pedido, y VU-02: su detalle y seguimiento (RN-062).
async function Content({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const actor = await getCurrentActor();
  const id = z.uuid().safeParse((await params).id);
  const canView = actor && hasPermission(actor.roles, "order.view_own") && id.success;
  if (!canView) return <p className="text-muted-foreground">No encontramos ese pedido.</p>;

  // RN-067: el cliente vuelve de Mercado Pago con el id del pago en la URL.
  // No se le cree a la URL: se consulta el pago y se aplica (si el aviso
  // automático ya lo hizo, no cambia nada). Va antes de leer el pedido, que
  // vence reservas: un pago aprobado al límite cuenta aunque el cliente vuelva
  // un poco tarde. Si falla, lo resuelve el aviso automático.
  const paymentId = z.string().regex(/^\d+$/).safeParse((await searchParams).payment_id);
  let paymentFailed = false;
  if (paymentId.success && paymentMode() === "mercadopago" && (await isOwnOrder(actor.id, id.data))) {
    try {
      const payment = await getPayment(paymentId.data);
      if (payment.external_reference === id.data) {
        paymentFailed = (await processPayment(payment)) === "payment_failed";
      }
    } catch (error) {
      console.error("No se pudo consultar el pago al volver de Mercado Pago", error);
    }
  }

  const order = await getCustomerOrder(actor.id, id.data);
  if (!order) return <p className="text-muted-foreground">No encontramos ese pedido.</p>;
  const result = resultMessage(order.status);
  const claims = await listOrderClaims(order.id);
  // El tope cuenta solo los que abrió el cliente (no el reembolso automático).
  const ownClaims = claims.filter((c) => c.origin === "customer").length;
  // RN-066: si todavía puede reclamar (estado, 48 h desde que lo recibió, tope).
  const receivedAt = order.history.findLast((h) => h.status === "received")?.createdAt ?? null;
  const claimable =
    !!actor &&
    hasPermission(actor.roles, "claim.open") &&
    canOpenClaim({ status: order.status, receivedAt, claims: ownClaims }, new Date()).ok;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Pedido {orderNumber(order.id)}</h1>
      <p role="status" className={`rounded-lg px-3 py-2 ${TONE_CLASSES[result.tone]}`}>
        {result.text}
      </p>
      {paymentFailed && order.status === "pending_payment" && (
        <p role="alert" className="text-sm text-destructive">
          El pago no se aprobó. Podés intentar de nuevo con otro medio mientras dure la reserva.
        </p>
      )}
      {order.status === "pending_payment" && (
        <Link href={`/pedidos/${order.id}/pagar`} className={buttonVariants({ className: "w-fit" })}>
          Ir a pagar
        </Link>
      )}

      <OrderSummary order={order} />

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">Seguimiento</h2>
        <ol className="flex flex-col gap-1 text-sm">
          {order.history.map((h, n) => (
            <li key={n} className="flex flex-wrap gap-2">
              <span className="font-medium">{STATUS_LABELS[h.status]}</span>
              <span className="text-muted-foreground">{dateTime.format(h.createdAt)}</span>
            </li>
          ))}
        </ol>
      </section>

      {canCustomerCancel(order.status) && <CancelOrderButton orderId={order.id} />}

      {(claims.length > 0 || claimable) && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-medium">Reclamos</h2>
          <ClaimList claims={claims} />
          {claimable && <ClaimForm orderId={order.id} />}
          {ownClaims >= MAX_CLAIMS_PER_ORDER && (
            <p className="text-sm text-muted-foreground">
              Recibimos tus reclamos. Llegaste al máximo de {MAX_CLAIMS_PER_ORDER} para este pedido.
            </p>
          )}
        </section>
      )}
    </div>
  );
}

export default function OrderPage({ params, searchParams }: PageProps<"/pedidos/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
      <Link href="/pedidos" className="text-sm underline-offset-4 hover:underline">
        ← Mis pedidos
      </Link>
      <Suspense fallback={<p className="text-muted-foreground">Cargando…</p>}>
        <Content params={params} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
