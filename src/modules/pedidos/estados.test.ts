import { describe, expect, it } from "vitest";
import {
  canTransition,
  isFinal,
  isReservationExpired,
  ORDER_STATUSES,
  releasesStock,
  RESERVATION_MINUTES,
  reservationDeadline,
  STATUS_LABELS,
} from "./estados";

describe("pedidos/estados (RN-062, RN-065: estados del pedido y quién los cambia)", () => {
  it("tiene los estados acordados, con su nombre en español", () => {
    expect(ORDER_STATUSES.map((s) => STATUS_LABELS[s])).toEqual([
      "Pago a confirmar",
      "Pagado",
      "En preparación",
      "En envío",
      "Recibido",
      "Rechazado",
      "Cancelado",
    ]);
  });

  it("solo la pasarela de pago aprueba o rechaza el pago", () => {
    expect(canTransition("pending_payment", "paid", "gateway")).toBe(true);
    expect(canTransition("pending_payment", "rejected", "gateway")).toBe(true);
    expect(canTransition("pending_payment", "paid", "admin")).toBe(false);
    expect(canTransition("pending_payment", "paid", "customer")).toBe(false);
  });

  it("el admin avanza el pedido paso a paso, sin saltear estados", () => {
    expect(canTransition("paid", "preparing", "admin")).toBe(true);
    expect(canTransition("preparing", "shipping", "admin")).toBe(true);
    expect(canTransition("shipping", "received", "admin")).toBe(true);
    expect(canTransition("paid", "shipping", "admin")).toBe(false);
    expect(canTransition("paid", "received", "admin")).toBe(false);
    expect(canTransition("paid", "preparing", "customer")).toBe(false);
  });

  it("el cliente cancela solo antes del envío (RN-065)", () => {
    for (const from of ["pending_payment", "paid", "preparing"] as const) {
      expect(canTransition(from, "cancelled", "customer")).toBe(true);
    }
    expect(canTransition("shipping", "cancelled", "customer")).toBe(false);
    expect(canTransition("received", "cancelled", "customer")).toBe(false);
  });

  it("el admin, que es omnipotente (RN-001), también puede cancelar antes del envío", () => {
    expect(canTransition("preparing", "cancelled", "admin")).toBe(true);
    expect(canTransition("shipping", "cancelled", "admin")).toBe(false);
  });

  it("el sistema cancela cuando vence la reserva sin pago (RN-064)", () => {
    expect(canTransition("pending_payment", "cancelled", "system")).toBe(true);
    expect(canTransition("paid", "cancelled", "system")).toBe(false);
  });

  it("de un estado final no se sale", () => {
    for (const from of ["received", "rejected", "cancelled"] as const) {
      expect(isFinal(from)).toBe(true);
      for (const to of ORDER_STATUSES) {
        for (const actor of ["gateway", "customer", "admin", "system"] as const) {
          expect(canTransition(from, to, actor)).toBe(false);
        }
      }
    }
    expect(isFinal("shipping")).toBe(false);
  });

  it("rechazar o cancelar devuelve el stock reservado (RN-064)", () => {
    expect(releasesStock("rejected")).toBe(true);
    expect(releasesStock("cancelled")).toBe(true);
    expect(releasesStock("paid")).toBe(false);
    expect(releasesStock("received")).toBe(false);
  });
});

describe("pedidos/estados: reserva de stock (RN-064)", () => {
  const now = new Date("2026-10-09T12:00:00Z");

  it("dura 30 minutos", () => {
    expect(RESERVATION_MINUTES).toBe(30);
    expect(reservationDeadline(now).toISOString()).toBe("2026-10-09T12:30:00.000Z");
  });

  it("vence solo si el pedido sigue esperando el pago", () => {
    const deadline = new Date("2026-10-09T12:30:00Z");
    const later = new Date("2026-10-09T12:30:00Z");
    expect(isReservationExpired({ status: "pending_payment", reservedUntil: deadline }, now)).toBe(false);
    expect(isReservationExpired({ status: "pending_payment", reservedUntil: deadline }, later)).toBe(true);
    expect(isReservationExpired({ status: "paid", reservedUntil: deadline }, later)).toBe(false);
  });
});
