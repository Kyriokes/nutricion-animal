import { describe, expect, it } from "vitest";
import { illustrationFor, illustrationVariant } from "./ilustracion";

describe("catalogo/ilustracion", () => {
  it("RN-031: elige el dibujo por el nombre del producto", () => {
    const cases: [string, ReturnType<typeof illustrationFor>][] = [
      ["Croquetas naturales de pollo", "kibble"],
      ["Alimento crudo BARF de vaca", "raw"],
      ["Paté de pavo para gatos", "can"],
      ["Guiso de ternera para perros", "stew"],
      ["Vianda de pollo y zapallo", "stew"],
      ["Caldo de huesos", "broth"],
      ["Snacks de hígado deshidratado", "treat"],
      ["Mezcla de semillas para conejos", "seeds"],
      ["Calcio en polvo", "supplement"],
      ["Aceite de salmón", "supplement"],
    ];
    for (const [name, kind] of cases) expect(illustrationFor(name), name).toBe(kind);
  });

  it("la variante de color depende solo del nombre y entra en el rango", () => {
    const names = ["Croquetas light para perros", "Croquetas para cachorros", "Croquetas naturales de pollo", ""];
    for (const name of names) {
      const v = illustrationVariant(name, 4);
      expect(v).toBe(illustrationVariant(name, 4));
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(4);
    }
    expect(new Set(names.map((n) => illustrationVariant(n, 4))).size).toBeGreaterThan(1);
  });

  it("no distingue mayúsculas ni tildes, y tiene un dibujo para lo demás", () => {
    expect(illustrationFor("PATE de pavo")).toBe("can");
    expect(illustrationFor("Juguete")).toBe("generic");
  });
});
