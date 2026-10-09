// RN-062: estados del pedido. El carrito no es un pedido: el pedido nace al
// confirmar la compra, esperando el pago.
//
//   pago a confirmar → pagado → en preparación → en envío → recibido
//           ↓            ↓            ↓
//       rechazado     cancelado    cancelado
export const ORDER_STATUSES = [
  "pending_payment",
  "paid",
  "preparing",
  "shipping",
  "received",
  "rejected",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: "Pago a confirmar",
  paid: "Pagado",
  preparing: "En preparación",
  shipping: "En envío",
  received: "Recibido",
  rejected: "Rechazado",
  cancelled: "Cancelado",
};

// Quién provoca el cambio: la pasarela de pago, el cliente, el admin o el
// sistema (vencimiento de la reserva).
export const ORDER_ACTORS = ["gateway", "customer", "admin", "system"] as const;
export type OrderActor = (typeof ORDER_ACTORS)[number];

// RN-065: qué cambios se permiten y quién puede hacerlos. El pago solo lo
// informa la pasarela, ni siquiera el admin. Cancelar se puede antes del
// envío: el cliente, el admin (RN-001) o el sistema si venció la reserva.
const TRANSITIONS: Record<OrderStatus, Partial<Record<OrderStatus, readonly OrderActor[]>>> = {
  pending_payment: {
    paid: ["gateway"],
    rejected: ["gateway"],
    cancelled: ["customer", "admin", "system"],
  },
  paid: { preparing: ["admin"], cancelled: ["customer", "admin"] },
  preparing: { shipping: ["admin"], cancelled: ["customer", "admin"] },
  shipping: { received: ["admin"] },
  received: {},
  rejected: {},
  cancelled: {},
};

export function canTransition(from: OrderStatus, to: OrderStatus, actor: OrderActor): boolean {
  return TRANSITIONS[from][to]?.includes(actor) ?? false;
}

export function isFinal(status: OrderStatus): boolean {
  return Object.keys(TRANSITIONS[status]).length === 0;
}

// RN-064: el stock se descuenta al crear el pedido; si se rechaza o se
// cancela, vuelve.
export function releasesStock(to: OrderStatus): boolean {
  return to === "rejected" || to === "cancelled";
}

export const RESERVATION_MINUTES = 30;

export function reservationDeadline(now: Date): Date {
  return new Date(now.getTime() + RESERVATION_MINUTES * 60_000);
}

export function isReservationExpired(
  order: { status: OrderStatus; reservedUntil: Date },
  now: Date,
): boolean {
  return order.status === "pending_payment" && now >= order.reservedUntil;
}
