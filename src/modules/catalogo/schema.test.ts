import { describe, expect, it } from "vitest";
import { ProductSchema } from "./schema";

describe("catalogo/schema", () => {
  it("valida un producto válido", () => {
    const producto = {
      name: "Croquetas Premium",
      description: "Croquetas de pollo para perros adultos",
      price: 25.99,
      brand: "NomNom",
      weight: { value: 500, unit: "g" as const },
      image: "https://example.com/croquetas.jpg",
      stock: 100,
      petTypes: ["perro"],
      dietTypes: ["proteica", "mantenimiento"],
    };
    const result = ProductSchema.safeParse(producto);
    expect(result.success).toBe(true);
  });

  it("valida un producto con volumen y tabla nutricional", () => {
    const producto = {
      name: "Comida húmeda",
      description: "Alimento húmedo con caldo",
      price: 15.5,
      brand: "PetCare",
      weight: { value: 400, unit: "g" as const },
      volume: { value: 350, unit: "ml" as const },
      image: "https://example.com/humedo.jpg",
      stock: 50,
      petTypes: ["gato", "perro"],
      nutritionalInfo: {
        protein: 25,
        fat: 12,
        fiber: 3,
      },
    };
    const result = ProductSchema.safeParse(producto);
    expect(result.success).toBe(true);
  });

  it("rechaza un producto sin tipos de mascota", () => {
    const producto = {
      name: "Inválido",
      description: "Sin mascotas",
      price: 10,
      brand: "Test",
      weight: { value: 100, unit: "g" as const },
      image: "https://example.com/test.jpg",
      stock: 10,
      petTypes: [],
    };
    const result = ProductSchema.safeParse(producto);
    expect(result.success).toBe(false);
  });

  it("rechaza precio negativo", () => {
    const producto = {
      name: "Precio negativo",
      description: "Inválido",
      price: -10,
      brand: "Test",
      weight: { value: 100, unit: "g" as const },
      image: "https://example.com/test.jpg",
      stock: 10,
      petTypes: ["perro"],
    };
    const result = ProductSchema.safeParse(producto);
    expect(result.success).toBe(false);
  });

  it("rechaza stock negativo", () => {
    const producto = {
      name: "Stock negativo",
      description: "Inválido",
      price: 20,
      brand: "Test",
      weight: { value: 100, unit: "g" as const },
      image: "https://example.com/test.jpg",
      stock: -5,
      petTypes: ["perro"],
    };
    const result = ProductSchema.safeParse(producto);
    expect(result.success).toBe(false);
  });

  it("rechaza URL de imagen inválida", () => {
    const producto = {
      name: "URL inválida",
      description: "Imagen sin protocolo",
      price: 20,
      brand: "Test",
      weight: { value: 100, unit: "g" as const },
      image: "no-es-url",
      stock: 10,
      petTypes: ["perro"],
    };
    const result = ProductSchema.safeParse(producto);
    expect(result.success).toBe(false);
  });
});
