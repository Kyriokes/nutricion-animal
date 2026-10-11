import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { OrderStatus } from "./estados";

// RN-067: pagos con Mercado Pago Checkout Pro (API de Preferences). El
// cliente paga en la página de Mercado Pago: el sitio nunca ve datos de
// tarjeta (DT-004). Acá, la lógica pura; las llamadas a la API están en
// mercadopago-api.ts.

// --- Modo de pago -----------------------------------------------------------

// Con el token cargado se paga con Mercado Pago. Sin token, el pago de prueba
// sigue disponible en desarrollo o si se activa con PAYMENTS_SIMULATED=true
// (DT-055); si no, no hay forma de pagar.
export function paymentMode(
  env: { MERCADOPAGO_ACCESS_TOKEN?: string; NODE_ENV?: string; PAYMENTS_SIMULATED?: string } = process.env,
): "mercadopago" | "simulated" | "unavailable" {
  if (env.MERCADOPAGO_ACCESS_TOKEN) return "mercadopago";
  if (env.NODE_ENV !== "production" || env.PAYMENTS_SIMULATED === "true") return "simulated";
  return "unavailable";
}

// --- Firma de los avisos (webhooks) ------------------------------------------

// Encabezado x-signature: "ts=1704908010,v1=<hmac en hexadecimal>".
export function parseSignatureHeader(header: string | null): { ts: string; v1: string } | null {
  if (!header) return null;
  const parts = Object.fromEntries(
    header.split(",").map((part) => {
      const i = part.indexOf("=");
      return i < 0 ? ["", ""] : [part.slice(0, i).trim(), part.slice(i + 1).trim()];
    }),
  );
  return parts.ts && parts.v1 ? { ts: parts.ts, v1: parts.v1 } : null;
}

// Texto que firma Mercado Pago. Los ids con letras van en minúscula.
export function webhookManifest(p: { dataId: string; requestId: string; ts: string }): string {
  return `id:${p.dataId.toLowerCase()};request-id:${p.requestId};ts:${p.ts};`;
}

// El aviso viene de Mercado Pago si su firma coincide con la que calculamos
// con la clave secreta (HMAC-SHA256). Comparación en tiempo constante.
export function verifyWebhookSignature(p: {
  signature: string | null;
  requestId: string | null;
  dataId: string;
  secret: string;
}): boolean {
  const header = parseSignatureHeader(p.signature);
  if (!header || !p.requestId || !p.secret) return false;
  const expected = createHmac("sha256", p.secret)
    .update(webhookManifest({ dataId: p.dataId, requestId: p.requestId, ts: header.ts }))
    .digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(header.v1);
  return a.length === b.length && timingSafeEqual(a, b);
}

// --- Cobro de un pedido ------------------------------------------------------

type PreferenceOrder = {
  id: string;
  items: readonly { productId?: string | null; name: string; unitPrice: number; quantity: number }[];
  shippingCost: number;
  carrier: string;
  reservedUntil: Date;
};

// Arma el cobro (preferencia) de un pedido.
// - Vence 5 minutos antes que la reserva de stock (RN-064): un pago aprobado
//   al límite llega con el stock todavía reservado.
// - Excluye los medios no instantáneos (efectivo en Rapipago/Pago Fácil,
//   cajeros): un pago que se acredita días después llegaría con la reserva
//   vencida y el stock liberado.
// - En el sitio publicado (https), vuelve solo al pedido y Mercado Pago avisa
//   al webhook; en local no hay avisos (Mercado Pago no llega a localhost).
const PREFERENCE_MARGIN_MS = 5 * 60_000;

export function buildPreference(order: PreferenceOrder, siteUrl: string) {
  const back = `${siteUrl}/pedidos/${order.id}`;
  const isPublic = siteUrl.startsWith("https://");
  return {
    items: [
      ...order.items.map((i, n) => ({
        id: i.productId ?? `item-${n}`,
        title: i.name,
        quantity: i.quantity,
        unit_price: i.unitPrice,
        currency_id: "ARS" as const,
      })),
      {
        id: "envio",
        title: `Envío (${order.carrier})`,
        quantity: 1,
        unit_price: order.shippingCost,
        currency_id: "ARS" as const,
      },
    ],
    external_reference: order.id,
    back_urls: { success: back, failure: back, pending: back },
    expires: true,
    expiration_date_to: new Date(order.reservedUntil.getTime() - PREFERENCE_MARGIN_MS).toISOString(),
    payment_methods: { excluded_payment_types: [{ id: "ticket" }, { id: "atm" }] },
    ...(isPublic
      ? { auto_return: "approved" as const, notification_url: `${siteUrl}/api/mercadopago/webhook` }
      : {}),
  };
}

// --- Qué hacer con un pago ---------------------------------------------------

// Lo que nos importa de un pago consultado a Mercado Pago. Nunca se confía en
// lo que llega en el aviso o en la URL de vuelta: siempre se consulta el pago.
export const PaymentSchema = z.object({
  id: z.union([z.number(), z.string()]).transform(String),
  status: z.string(),
  external_reference: z.string().nullable().optional(),
  transaction_amount: z.number(),
  currency_id: z.string(),
});

export type Payment = z.infer<typeof PaymentSchema>;

export type PaymentAction =
  | { action: "paid"; paymentRef: string }
  | { action: "payment_failed" }
  | { action: "refund_needed"; paymentRef: string }
  | { action: "payment_reversed"; paymentRef: string; status: string }
  | { action: "mismatch" }
  | { action: "ignore" };

const cents = (n: number) => Math.round(n * 100);

// Estados de Mercado Pago en los que el dinero vuelve o está en disputa.
const REVERSED = ["refunded", "charged_back", "in_mediation"];
const PAID_STATUSES: readonly OrderStatus[] = ["paid", "preparing", "shipping", "received"];

export function interpretPayment(
  payment: Payment,
  order: { id: string; status: OrderStatus; total: number; paymentRef: string | null },
): PaymentAction {
  // Un pago que no corresponde exactamente a este pedido no lo cambia.
  if (
    payment.external_reference !== order.id ||
    payment.currency_id !== "ARS" ||
    cents(payment.transaction_amount) !== cents(order.total)
  ) {
    return { action: "mismatch" };
  }
  if (payment.status === "approved") {
    if (order.status === "pending_payment") return { action: "paid", paymentRef: payment.id };
    // El mismo pago repetido (aviso y vuelta, o avisos duplicados): nada.
    if (PAID_STATUSES.includes(order.status) && order.paymentRef === payment.id) return { action: "ignore" };
    // Cobrado sin que corresponda: pedido cancelado o rechazado, o un
    // segundo pago del mismo pedido (dos pestañas). Hay que devolverlo (RN-069).
    return { action: "refund_needed", paymentRef: payment.id };
  }
  // Rechazado: el pedido sigue esperando el pago. En Checkout Pro el cliente
  // puede reintentar con otro medio; si no paga, lo cancela el vencimiento
  // de la reserva (RN-064).
  if (payment.status === "rejected" || payment.status === "cancelled") return { action: "payment_failed" };
  // Devuelto, contracargo o en disputa sobre el pago del pedido: revisar antes
  // de enviar.
  if (REVERSED.includes(payment.status) && order.paymentRef === payment.id && PAID_STATUSES.includes(order.status)) {
    return { action: "payment_reversed", paymentRef: payment.id, status: payment.status };
  }
  return { action: "ignore" };
}
