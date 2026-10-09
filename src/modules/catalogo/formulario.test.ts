import { describe, expect, it } from "vitest";
import { normalizeTag, parseProductForm } from "./formulario";

const base = {
  name: "Croquetas de pollo",
  description: "Alimento natural para perros adultos",
  price: "12500,50",
  brand: "NomNom",
  weightValue: "3",
  weightUnit: "kg",
  stock: "20",
  petTypes: "Perro, perro , Gato",
};

describe("catalogo/formulario (RN-030, sección 7: campos del producto)", () => {
  it("normaliza etiquetas: minúsculas y sin espacios de más", () => {
    expect(normalizeTag("  Perro ")).toBe("perro");
    expect(normalizeTag("Alta  Proteína")).toBe("alta proteína");
  });

  it("convierte el formulario en un producto", () => {
    expect(parseProductForm(base)).toEqual({
      ok: true,
      product: {
        name: "Croquetas de pollo",
        description: "Alimento natural para perros adultos",
        price: 12500.5,
        brand: "NomNom",
        weight: { value: 3, unit: "kg" },
        stock: 20,
        // RN-013: en minúscula y sin repetir, para coincidir con la especie.
        petTypes: ["perro", "gato"],
        dietTypes: [],
      },
    });
  });

  it("acepta volumen, tipos de dieta, imagen y tabla nutricional opcionales", () => {
    const r = parseProductForm({
      ...base,
      price: "9.999",
      volumeValue: "500",
      volumeUnit: "ml",
      dietTypes: "Proteica, mantenimiento",
      imageUrl: "https://example.com/a.jpg",
      protein: "25,5",
      fat: "12",
      fiber: "",
    });
    expect(r).toMatchObject({
      ok: true,
      product: {
        price: 9999,
        volume: { value: 500, unit: "ml" },
        dietTypes: ["proteica", "mantenimiento"],
        image: "https://example.com/a.jpg",
        nutritionalInfo: { protein: 25.5, fat: 12 },
      },
    });
  });

  it("rechaza números con punto decimal en vez de multiplicarlos sin avisar", () => {
    // Antes: "12.5" se guardaba como 125, "0.5" kg como 5 kg y "3.5" % como 35 %.
    for (const price of ["12.5", "1,000.50", "12.50"]) {
      expect(parseProductForm({ ...base, price })).toEqual({
        ok: false,
        message: "El precio no es válido: usá coma para los decimales (ej.: 12.500,50)",
      });
    }
    expect(parseProductForm({ ...base, weightValue: "0.5" })).toEqual({
      ok: false,
      message: "El peso no es válido: usá coma para los decimales (ej.: 0,5)",
    });
    expect(parseProductForm({ ...base, fat: "3.5" })).toEqual({
      ok: false,
      message: "Los valores nutricionales no son válidos: usá coma para los decimales (ej.: 3,5)",
    });
  });

  it("acepta los formatos argentinos: punto de miles solo en el precio", () => {
    expect(parseProductForm({ ...base, price: "12.500,50" })).toMatchObject({ ok: true, product: { price: 12500.5 } });
    expect(parseProductForm({ ...base, price: "1.234.567" })).toMatchObject({ ok: true, product: { price: 1234567 } });
    expect(parseProductForm({ ...base, price: "12500" })).toMatchObject({ ok: true, product: { price: 12500 } });
    expect(parseProductForm({ ...base, weightValue: "0,5", fat: "3,5" })).toMatchObject({
      ok: true,
      product: { weight: { value: 0.5 }, nutritionalInfo: { fat: 3.5 } },
    });
  });

  it("explica en español qué está mal", () => {
    expect(parseProductForm({ ...base, price: "0" })).toEqual({ ok: false, message: "El precio debe ser mayor a 0" });
    expect(parseProductForm({ ...base, price: "caro" })).toEqual({
      ok: false,
      message: "El precio no es válido: usá coma para los decimales (ej.: 12.500,50)",
    });
    expect(parseProductForm({ ...base, stock: "-1" })).toEqual({ ok: false, message: "El stock debe ser un número entero, 0 o más" });
    expect(parseProductForm({ ...base, petTypes: " , " })).toEqual({
      ok: false,
      message: "Debe indicar al menos un tipo de mascota",
    });
    expect(parseProductForm({ ...base, protein: "120" })).toMatchObject({ ok: false });
  });
});
