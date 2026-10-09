import { z } from "zod";
import { canTransition, isFinal, ORDER_STATUSES, type OrderStatus } from "./estados";

// RN-090: "pendientes" son los pedidos que todavía no llegaron a un estado final.
export const PENDING_STATUSES: readonly OrderStatus[] = ORDER_STATUSES.filter((s) => !isFinal(s));

export const ORDER_FILTERS = ["pendientes", "todos", ...ORDER_STATUSES] as const;
export type OrderFilter = (typeof ORDER_FILTERS)[number];

// VA-04: filtros de la lista de pedidos del admin, leídos de la URL. Lo
// inválido vuelve al valor por defecto (pendientes, primera página).
export const AdminOrderFilterSchema = z.object({
  estado: z.enum(ORDER_FILTERS).catch("pendientes"),
  pagina: z.coerce.number().int().min(1).max(10_000).catch(1),
});

// Estados a mostrar; null = todos.
export function statusesFor(filter: OrderFilter): readonly OrderStatus[] | null {
  if (filter === "todos") return null;
  if (filter === "pendientes") return PENDING_STATUSES;
  return [filter];
}

// RN-065: los cambios que el admin puede hacer sobre un pedido en este estado.
export function adminActions(status: OrderStatus): OrderStatus[] {
  return ORDER_STATUSES.filter((to) => canTransition(status, to, "admin"));
}
