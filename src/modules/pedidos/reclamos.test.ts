import { describe, expect, it } from "vitest";
import {
  AdminClaimFilterSchema,
  CLAIM_STATUS_LABELS,
  CLAIM_WINDOW_HOURS,
  canChangeClaim,
  canOpenClaim,
  claimStatusesFor,
  ClaimInputSchema,
  MAX_CLAIMS_PER_ORDER,
  needsRefundClaim,
  REFUND_CLAIM_DESCRIPTION,
  RESOLUTION_LABELS,
  ResolveClaimSchema,
} from "./reclamos";

const now = new Date("2026-10-09T12:00:00Z");
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000);

describe("pedidos/reclamos (RN-066): cuándo se puede abrir un reclamo", () => {
  it("desde que el pedido está pagado", () => {
    for (const status of ["paid", "preparing", "shipping"] as const) {
      expect(canOpenClaim({ status, receivedAt: null, claims: 0 }, now)).toEqual({ ok: true });
    }
  });

  it("hasta 48 horas después de recibido", () => {
    expect(CLAIM_WINDOW_HOURS).toBe(48);
    expect(canOpenClaim({ status: "received", receivedAt: hoursAgo(47), claims: 0 }, now)).toEqual({ ok: true });
    expect(canOpenClaim({ status: "received", receivedAt: hoursAgo(48), claims: 0 }, now)).toEqual({
      ok: false,
      error: "window_closed",
    });
  });

  it("un recibido sin fecha de recepción registrada no se puede reclamar (caso seguro)", () => {
    expect(canOpenClaim({ status: "received", receivedAt: null, claims: 0 }, now)).toEqual({
      ok: false,
      error: "window_closed",
    });
  });

  it("no en pedidos sin pagar, rechazados o cancelados", () => {
    for (const status of ["pending_payment", "rejected", "cancelled"] as const) {
      expect(canOpenClaim({ status, receivedAt: null, claims: 0 }, now)).toEqual({ ok: false, error: "not_allowed" });
    }
  });

  it("con un tope de reclamos por pedido", () => {
    expect(MAX_CLAIMS_PER_ORDER).toBe(5);
    expect(canOpenClaim({ status: "paid", receivedAt: null, claims: 5 }, now)).toEqual({ ok: false, error: "too_many" });
  });
});

describe("pedidos/reclamos: datos y estados", () => {
  it("pide describir el problema", () => {
    expect(ClaimInputSchema.safeParse({ description: "  Llegó roto el paquete  " })).toMatchObject({
      success: true,
      data: { description: "Llegó roto el paquete" },
    });
    expect(ClaimInputSchema.safeParse({ description: "corto" }).success).toBe(false);
    expect(ClaimInputSchema.safeParse({ description: "x".repeat(2001) }).success).toBe(false);
  });

  it("el admin lo revisa y lo resuelve; resuelto es final", () => {
    expect(canChangeClaim("open", "in_review")).toBe(true);
    expect(canChangeClaim("open", "resolved")).toBe(true);
    expect(canChangeClaim("in_review", "resolved")).toBe(true);
    expect(canChangeClaim("in_review", "open")).toBe(false);
    expect(canChangeClaim("resolved", "in_review")).toBe(false);
    expect(canChangeClaim("open", "open")).toBe(false);
  });

  it("al resolver se elige la resolución y una nota opcional para el cliente", () => {
    expect(ResolveClaimSchema.parse({ resolution: "refund", note: " Te devolvemos el dinero " })).toEqual({
      resolution: "refund",
      note: "Te devolvemos el dinero",
    });
    expect(ResolveClaimSchema.parse({ resolution: "no_change", note: "  " })).toEqual({ resolution: "no_change" });
    expect(ResolveClaimSchema.safeParse({ resolution: "regalo" }).success).toBe(false);
    expect(ResolveClaimSchema.safeParse({ resolution: "resend", note: "x".repeat(501) }).success).toBe(false);
  });

  it("tiene nombres en español", () => {
    expect(CLAIM_STATUS_LABELS).toEqual({ open: "Abierto", in_review: "En revisión", resolved: "Resuelto" });
    expect(RESOLUTION_LABELS).toEqual({ refund: "Reembolso", resend: "Reenvío", no_change: "Sin cambios" });
  });
});

describe("pedidos/reclamos: lista del admin (RN-090)", () => {
  it("abre en los abiertos (sin resolver)", () => {
    expect(AdminClaimFilterSchema.parse({})).toEqual({ estado: "abiertos", pagina: 1 });
    expect(claimStatusesFor("abiertos")).toEqual(["open", "in_review"]);
    expect(claimStatusesFor("todos")).toBeNull();
    expect(claimStatusesFor("resolved")).toEqual(["resolved"]);
    expect(AdminClaimFilterSchema.parse({ estado: "otro", pagina: "2" })).toEqual({ estado: "abiertos", pagina: 2 });
  });
});

describe("pedidos/reclamos: reembolso al cancelar un pedido pagado (RN-066, decisión 1a)", () => {
  it("cancelar después de pagar abre un reclamo de reembolso", () => {
    expect(needsRefundClaim("paid", "cancelled")).toBe(true);
    expect(needsRefundClaim("preparing", "cancelled")).toBe(true);
  });

  it("cancelar sin haber pagado, o cualquier otro cambio, no", () => {
    expect(needsRefundClaim("pending_payment", "cancelled")).toBe(false);
    expect(needsRefundClaim("paid", "preparing")).toBe(false);
    expect(needsRefundClaim("pending_payment", "rejected")).toBe(false);
  });

  it("explica el reclamo automático", () => {
    expect(REFUND_CLAIM_DESCRIPTION).toBe(
      "Reembolso pendiente: el pedido se canceló después de pagado. Generado automáticamente.",
    );
  });
});
