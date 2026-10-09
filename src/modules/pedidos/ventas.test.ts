import { describe, expect, it } from "vitest";
import { periodRange, SALE_STATUSES, SalesFilterSchema, todayInBuenosAires } from "./ventas";

// 9 de octubre, 01:30 en Buenos Aires (04:30 UTC).
const now = new Date("2026-10-09T04:30:00Z");

describe("pedidos/ventas (RN-090: ventas del dashboard)", () => {
  it("una venta es un pedido pagado que no se canceló ni rechazó", () => {
    expect(SALE_STATUSES).toEqual(["paid", "preparing", "shipping", "received"]);
  });

  it("el día de hoy se cuenta en hora de Buenos Aires", () => {
    expect(todayInBuenosAires(now)).toEqual({ date: "2026-10-09", month: "2026-10" });
    // 23:30 del 8 en Buenos Aires = 02:30 UTC del 9.
    expect(todayInBuenosAires(new Date("2026-10-09T02:30:00Z"))).toEqual({ date: "2026-10-08", month: "2026-10" });
  });

  it("por defecto filtra el día de hoy", () => {
    expect(SalesFilterSchema(now).parse({})).toEqual({ periodo: "dia", fecha: "2026-10-09", mes: "2026-10", pagina: 1 });
  });

  it("acepta día, mes o todo; lo inválido vuelve al valor por defecto", () => {
    expect(SalesFilterSchema(now).parse({ periodo: "mes", mes: "2026-09", pagina: "2" })).toMatchObject({
      periodo: "mes",
      mes: "2026-09",
      pagina: 2,
    });
    expect(SalesFilterSchema(now).parse({ periodo: "dia", fecha: "2026-02-30" }).fecha).toBe("2026-10-09");
    expect(SalesFilterSchema(now).parse({ periodo: "x", fecha: "2026-13-40", mes: "abc" })).toEqual({
      periodo: "dia",
      fecha: "2026-10-09",
      mes: "2026-10",
      pagina: 1,
    });
  });

  it("ignora páginas inválidas y parámetros repetidos en la URL", () => {
    expect(SalesFilterSchema(now).parse({ pagina: "0" }).pagina).toBe(1);
    expect(SalesFilterSchema(now).parse({ pagina: "99999" }).pagina).toBe(1);
    expect(SalesFilterSchema(now).parse({ periodo: ["mes", "dia"], mes: ["2026-01", "2026-02"] })).toMatchObject({
      periodo: "dia",
      mes: "2026-10",
    });
  });

  it("convierte el período en un rango de fechas (Buenos Aires, UTC-3)", () => {
    expect(periodRange({ periodo: "dia", fecha: "2026-10-09", mes: "2026-10" })).toEqual({
      from: new Date("2026-10-09T03:00:00Z"),
      to: new Date("2026-10-10T03:00:00Z"),
    });
    expect(periodRange({ periodo: "mes", fecha: "2026-10-09", mes: "2026-12" })).toEqual({
      from: new Date("2026-12-01T03:00:00Z"),
      to: new Date("2027-01-01T03:00:00Z"),
    });
    expect(periodRange({ periodo: "todo", fecha: "2026-10-09", mes: "2026-10" })).toBeNull();
  });
});
