import { describe, expect, it } from "vitest";
import { FoodNameSchema, findSimilarFoods, normalizeFoodName, singularKey } from "./nombres";

describe("alimentos/nombres (RN-032: lista única de alimentos)", () => {
  it("normaliza: minúsculas, sin tildes, sin espacios de más", () => {
    expect(normalizeFoodName("  Pechuga   de POLLO ")).toBe("pechuga de pollo");
    expect(normalizeFoodName("Limón")).toBe("limon");
    expect(normalizeFoodName("Ñandú")).toBe("nandu");
  });

  it("valida el nombre", () => {
    expect(FoodNameSchema.parse("  Zanahoria ")).toBe("Zanahoria");
    expect(FoodNameSchema.parse("Omega 3")).toBe("Omega 3");
    expect(FoodNameSchema.safeParse("a").success).toBe(false);
    expect(FoodNameSchema.safeParse("x".repeat(61)).success).toBe(false);
    expect(FoodNameSchema.safeParse("<script>").success).toBe(false);
  });

  it("lleva cada palabra al singular para comparar", () => {
    expect(singularKey("Zanahorias")).toBe("zanahoria");
    expect(singularKey("limones")).toBe("limon");
    expect(singularKey("nueces")).toBe("nuez");
    expect(singularKey("huevos de codorniz")).toBe("huevo de codorniz");
    expect(singularKey("arroz")).toBe("arroz");
    expect(singularKey("tres")).toBe("tres");
  });
});

describe("alimentos/nombres: alimentos parecidos (aviso al agregar)", () => {
  const foods = [
    { id: "1", name: "Zanahoria", aliases: [] },
    { id: "2", name: "Pollo", aliases: ["Pechuga de pollo"] },
    { id: "3", name: "Arroz integral", aliases: [] },
    { id: "4", name: "Calabaza", aliases: [] },
  ];

  it("encuentra el mismo alimento en plural", () => {
    expect(findSimilarFoods("zanahorias", foods).map((f) => f.id)).toEqual(["1"]);
  });

  it("encuentra errores de tipeo", () => {
    expect(findSimilarFoods("zanaoria", foods).map((f) => f.id)).toEqual(["1"]);
    expect(findSimilarFoods("calabasa", foods).map((f) => f.id)).toEqual(["4"]);
  });

  it("encuentra por sinónimos y por palabras contenidas", () => {
    expect(findSimilarFoods("pechugas de pollo", foods).map((f) => f.id)).toEqual(["2"]);
    expect(findSimilarFoods("arroz", foods).map((f) => f.id)).toEqual(["3"]);
    expect(findSimilarFoods("muslo de pollo", foods).map((f) => f.id)).toEqual(["2"]);
  });

  it("no inventa parecidos", () => {
    expect(findSimilarFoods("batata", foods)).toEqual([]);
    expect(findSimilarFoods("pescado", foods)).toEqual([]);
  });
});
