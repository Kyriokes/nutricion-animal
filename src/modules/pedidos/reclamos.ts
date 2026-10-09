import { z } from "zod";
import type { OrderStatus } from "./estados";

// RN-066: un problema con un pedido no es un estado del pedido sino un
// reclamo aparte, con su propio estado y una resolución al cerrarse. El
// pedido conserva su estado.
export const CLAIM_STATUSES = ["open", "in_review", "resolved"] as const;
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

export const CLAIM_STATUS_LABELS: Record<ClaimStatus, string> = {
  open: "Abierto",
  in_review: "En revisión",
  resolved: "Resuelto",
};

// La resolución se registra; el reembolso real llega con Mercado Pago (RN-067).
export const RESOLUTIONS = ["refund", "resend", "no_change"] as const;
export type Resolution = (typeof RESOLUTIONS)[number];

export const RESOLUTION_LABELS: Record<Resolution, string> = {
  refund: "Reembolso",
  resend: "Reenvío",
  no_change: "Sin cambios",
};

export const CLAIM_WINDOW_HOURS = 48;
export const MAX_CLAIMS_PER_ORDER = 5;

// Pedidos sobre los que se puede reclamar: desde que se pagó (por ejemplo,
// si nunca llegó) hasta 48 h después de recibido.
const CLAIMABLE: readonly OrderStatus[] = ["paid", "preparing", "shipping", "received"];

export type OpenClaimError = "not_allowed" | "window_closed" | "too_many";

export function canOpenClaim(
  order: { status: OrderStatus; receivedAt: Date | null; claims: number },
  now: Date,
): { ok: true } | { ok: false; error: OpenClaimError } {
  if (!CLAIMABLE.includes(order.status)) return { ok: false, error: "not_allowed" };
  if (order.status === "received") {
    const deadline = (order.receivedAt?.getTime() ?? 0) + CLAIM_WINDOW_HOURS * 3_600_000;
    if (now.getTime() >= deadline) return { ok: false, error: "window_closed" };
  }
  if (order.claims >= MAX_CLAIMS_PER_ORDER) return { ok: false, error: "too_many" };
  return { ok: true };
}

export const ClaimInputSchema = z.object({
  description: z
    .string()
    .trim()
    .min(10, "Contanos qué pasó (al menos 10 caracteres).")
    .max(2000, "Hasta 2000 caracteres."),
});

// El admin lo pasa a revisión o lo resuelve; resuelto es final.
const CLAIM_TRANSITIONS: Record<ClaimStatus, readonly ClaimStatus[]> = {
  open: ["in_review", "resolved"],
  in_review: ["resolved"],
  resolved: [],
};

export function canChangeClaim(from: ClaimStatus, to: ClaimStatus): boolean {
  return CLAIM_TRANSITIONS[from].includes(to);
}

// Al resolver: la resolución y, si quiere, una nota corta que ve el cliente.
export const ResolveClaimSchema = z
  .object({
    resolution: z.enum(RESOLUTIONS),
    note: z.string().trim().max(500, "La nota: hasta 500 caracteres.").optional(),
  })
  .transform(({ resolution, note }) => ({ resolution, ...(note ? { note } : {}) }));

// RN-090: la lista del admin abre en los reclamos sin resolver.
export const CLAIM_FILTERS = ["abiertos", "todos", ...CLAIM_STATUSES] as const;
export type ClaimFilter = (typeof CLAIM_FILTERS)[number];

export const AdminClaimFilterSchema = z.object({
  estado: z.enum(CLAIM_FILTERS).catch("abiertos"),
  pagina: z.coerce.number().int().min(1).max(10_000).catch(1),
});

export function claimStatusesFor(filter: ClaimFilter): readonly ClaimStatus[] | null {
  if (filter === "todos") return null;
  if (filter === "abiertos") return ["open", "in_review"];
  return [filter];
}

// Decisión de Sergio (1a): si un pedido se cancela después de pagado, el
// sistema abre solo un reclamo de reembolso, así la devolución del dinero no
// se olvida. Nace abierto; el admin lo resuelve con "Reembolso" al devolverlo.
export const REFUND_CLAIM_DESCRIPTION =
  "Reembolso pendiente: el pedido se canceló después de pagado. Generado automáticamente.";

export function needsRefundClaim(from: OrderStatus, to: OrderStatus): boolean {
  return to === "cancelled" && (from === "paid" || from === "preparing");
}
