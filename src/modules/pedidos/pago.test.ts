import { describe, expect, it } from "vitest";
import { simulatedPaymentsEnabled } from "./pago";

describe("pedidos/pago: pago de prueba (RN-067, DT-055)", () => {
  it("está activo mientras se desarrolla", () => {
    expect(simulatedPaymentsEnabled({ NODE_ENV: "development" })).toBe(true);
    expect(simulatedPaymentsEnabled({ NODE_ENV: "test" })).toBe(true);
  });

  it("en producción está apagado salvo que se active a propósito", () => {
    expect(simulatedPaymentsEnabled({ NODE_ENV: "production" })).toBe(false);
    expect(simulatedPaymentsEnabled({ NODE_ENV: "production", PAYMENTS_SIMULATED: "false" })).toBe(false);
    expect(simulatedPaymentsEnabled({ NODE_ENV: "production", PAYMENTS_SIMULATED: "true" })).toBe(true);
  });
});
