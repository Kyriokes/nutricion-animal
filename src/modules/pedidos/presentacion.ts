import { canTransition, type OrderStatus } from "./estados";

// Número corto para mostrar y para que el cliente lo cite ("Pedido 9F1C2A3B").
export function orderNumber(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

// RN-065: si el cliente todavía puede cancelar.
export function canCustomerCancel(status: OrderStatus): boolean {
  return canTransition(status, "cancelled", "customer");
}

export type Tone = "success" | "warning" | "error" | "info";

// VU-10: mensaje principal del resultado del pedido.
const RESULTS: Record<OrderStatus, { tone: Tone; text: string }> = {
  pending_payment: { tone: "warning", text: "Tu pedido está reservado: falta el pago." },
  paid: { tone: "success", text: "¡Pago aprobado! Ya estamos con tu pedido." },
  preparing: { tone: "info", text: "Estamos preparando tu pedido." },
  shipping: { tone: "info", text: "Tu pedido está en camino." },
  received: { tone: "success", text: "Tu pedido fue entregado." },
  rejected: { tone: "error", text: "El pago fue rechazado. Los productos volvieron al stock." },
  cancelled: { tone: "error", text: "El pedido se canceló. Los productos volvieron al stock." },
};

export function resultMessage(status: OrderStatus): { tone: Tone; text: string } {
  return RESULTS[status];
}
