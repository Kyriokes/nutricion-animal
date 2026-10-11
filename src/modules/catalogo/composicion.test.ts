import { describe, expect, it } from "vitest";
import { describeComposition, parseCompositionForm } from "./composicion";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";

describe("catalogo/composicion (RN-033, RN-034: composición y \"puede contener\")", () => {
  it("lee los ingredientes en orden, con porcentaje optativo salvo el principal", () => {
    expect(
      parseCompositionForm({
        ingredients: [
          { foodId: A, percentage: "60" },
          { foodId: B, percentage: "" },
          { foodId: C, percentage: "4,5" },
        ],
        traces: [],
      }),
    ).toEqual({
      ok: true,
      composition: {
        ingredients: [
          { foodId: A, percentage: 60 },
          { foodId: B },
          { foodId: C, percentage: 4.5 },
        ],
        traces: [],
      },
    });
  });

  it("acepta un producto sin composición cargada", () => {
    expect(parseCompositionForm({ ingredients: [], traces: [] })).toEqual({
      ok: true,
      composition: { ingredients: [], traces: [] },
    });
  });

  it("pide el porcentaje del ingrediente principal", () => {
    expect(parseCompositionForm({ ingredients: [{ foodId: A, percentage: "" }], traces: [] })).toEqual({
      ok: false,
      message: "Indicá el porcentaje del ingrediente principal (el primero).",
    });
  });

  it("los porcentajes van de mayor a menor, suman hasta 100 y son números válidos", () => {
    const two = (p1: string, p2: string) =>
      parseCompositionForm({ ingredients: [{ foodId: A, percentage: p1 }, { foodId: B, percentage: p2 }], traces: [] });
    expect(two("30", "40")).toEqual({
      ok: false,
      message: "Los ingredientes van de mayor a menor: el 2.º no puede tener más porcentaje que uno anterior.",
    });
    expect(two("70", "40")).toEqual({ ok: false, message: "Los porcentajes no pueden sumar más de 100." });
    expect(two("abc", "")).toEqual({ ok: false, message: "Porcentaje inválido en el 1.º ingrediente: usá un número entre 0 y 100." });
    expect(two("0", "")).toEqual({ ok: false, message: "Porcentaje inválido en el 1.º ingrediente: usá un número entre 0 y 100." });
  });

  it("no repite alimentos, y lo que \"puede contener\" no está entre los ingredientes", () => {
    expect(
      parseCompositionForm({ ingredients: [{ foodId: A, percentage: "50" }, { foodId: A, percentage: "" }], traces: [] }),
    ).toEqual({ ok: false, message: "Un alimento aparece dos veces en la composición." });
    expect(parseCompositionForm({ ingredients: [{ foodId: A, percentage: "50" }], traces: [A] })).toEqual({
      ok: false,
      message: "Un alimento no puede estar a la vez en la composición y en \"puede contener\".",
    });
    expect(parseCompositionForm({ ingredients: [], traces: [B, B] })).toEqual({
      ok: true,
      composition: { ingredients: [], traces: [B] },
    });
  });

  it("rechaza datos malformados", () => {
    expect(parseCompositionForm({ ingredients: [{ foodId: "x", percentage: "1" }], traces: [] })).toEqual({
      ok: false,
      message: "Datos de composición inválidos.",
    });
    expect(parseCompositionForm(null)).toEqual({ ok: false, message: "Datos de composición inválidos." });
  });
});

describe("catalogo/composicion: cómo se muestra", () => {
  it("como en la etiqueta", () => {
    expect(
      describeComposition([
        { name: "Pollo", percentage: 60 },
        { name: "Arroz" },
        { name: "Zanahoria", percentage: 4.5 },
      ]),
    ).toBe("Pollo (60 %), arroz, zanahoria (4,5 %)");
    expect(describeComposition([])).toBe("");
  });
});
