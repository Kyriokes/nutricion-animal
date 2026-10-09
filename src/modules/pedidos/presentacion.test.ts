import { describe, expect, it } from "vitest";
import { canCustomerCancel, orderNumber, resultMessage } from "./presentacion";

describe("pedidos/presentacion (VU-02, VU-10)", () => {
  it("muestra un número corto de pedido", () => {
    expect(orderNumber("9f1c2a3b-4d5e-4f60-8a7b-1c2d3e4f5a6b")).toBe("9F1C2A3B");
  });

  it("ofrece cancelar solo mientras el cliente puede (RN-065)", () => {
    expect(canCustomerCancel("pending_payment")).toBe(true);
    expect(canCustomerCancel("preparing")).toBe(true);
    expect(canCustomerCancel("shipping")).toBe(false);
    expect(canCustomerCancel("cancelled")).toBe(false);
  });

  it("explica el resultado del pedido (VU-10)", () => {
    expect(resultMessage("pending_payment")).toEqual({ tone: "warning", text: "Tu pedido está reservado: falta el pago." });
    expect(resultMessage("paid")).toEqual({ tone: "success", text: "¡Pago aprobado! Ya estamos con tu pedido." });
    expect(resultMessage("rejected")).toEqual({ tone: "error", text: "El pago fue rechazado. Los productos volvieron al stock." });
    expect(resultMessage("cancelled")).toEqual({ tone: "error", text: "El pedido se canceló. Los productos volvieron al stock." });
    expect(resultMessage("shipping")).toEqual({ tone: "info", text: "Tu pedido está en camino." });
  });
});
