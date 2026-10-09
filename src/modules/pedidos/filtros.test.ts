import { describe, expect, it } from "vitest";
import { adminActions, AdminOrderFilterSchema, PENDING_STATUSES, statusesFor } from "./filtros";

describe("pedidos/filtros (VA-04, RN-090: lista de pedidos del admin)", () => {
  it("por defecto muestra los pendientes, en la primera página", () => {
    expect(AdminOrderFilterSchema.parse({})).toEqual({ estado: "pendientes", pagina: 1 });
  });

  it("acepta todos, un estado puntual y la página; lo inválido vuelve al valor por defecto", () => {
    expect(AdminOrderFilterSchema.parse({ estado: "todos", pagina: "3" })).toEqual({ estado: "todos", pagina: 3 });
    expect(AdminOrderFilterSchema.parse({ estado: "shipping" })).toEqual({ estado: "shipping", pagina: 1 });
    expect(AdminOrderFilterSchema.parse({ estado: "cualquiera", pagina: "-2" })).toEqual({
      estado: "pendientes",
      pagina: 1,
    });
  });

  it("pendientes son los que no llegaron a un estado final", () => {
    expect(PENDING_STATUSES).toEqual(["pending_payment", "paid", "preparing", "shipping"]);
    expect(statusesFor("pendientes")).toEqual(PENDING_STATUSES);
    expect(statusesFor("todos")).toBeNull();
    expect(statusesFor("received")).toEqual(["received"]);
  });
});

describe("pedidos/filtros: qué puede hacer el admin con un pedido (RN-065)", () => {
  it("avanzar al siguiente paso y cancelar antes del envío", () => {
    expect(adminActions("pending_payment")).toEqual(["cancelled"]);
    expect(adminActions("paid")).toEqual(["preparing", "cancelled"]);
    expect(adminActions("preparing")).toEqual(["shipping", "cancelled"]);
    expect(adminActions("shipping")).toEqual(["received"]);
    expect(adminActions("received")).toEqual([]);
  });
});
