import { z } from "zod";

// Etiqueta comparable: minúsculas y espacios simples. Así "Perro" y "perro "
// coinciden con la especie de las mascotas (RN-013).
export const normalizeTag = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

const tagList = (max: number) =>
  z
    .array(z.string().trim().min(1).max(40))
    .max(max)
    .transform((tags) => [...new Set(tags.map(normalizeTag))]);

// Información nutricional de un producto (opcional), en porcentajes.
export const NutritionalInfoSchema = z.object({
  protein: z.number().min(0).max(100).optional(),
  fat: z.number().min(0).max(100).optional(),
  fiber: z.number().min(0).max(100).optional(),
  ash: z.number().min(0).max(100).optional(),
  moisture: z.number().min(0).max(100).optional(),
  notes: z.string().max(500).optional(),
});

// Producto del catálogo (RN-030, sección 7). La imagen es opcional: los
// productos de prueba de la primera versión no tienen (RN-031).
export const ProductSchema = z.object({
  name: z.string().trim().min(1, "El nombre del producto es requerido").max(120, "El nombre puede tener hasta 120 caracteres"),
  description: z.string().trim().min(1, "La descripción es requerida").max(2000, "La descripción puede tener hasta 2000 caracteres"),
  price: z.number({ error: "El precio debe ser un número" }).positive("El precio debe ser mayor a 0").max(100_000_000),
  brand: z.string().trim().min(1, "La marca es requerida").max(80, "La marca puede tener hasta 80 caracteres"),
  weight: z.object({
    value: z.number({ error: "El peso debe ser un número" }).positive("El peso debe ser mayor a 0"),
    unit: z.enum(["g", "kg"]),
  }),
  volume: z
    .object({
      value: z.number({ error: "El volumen debe ser un número" }).positive("El volumen debe ser mayor a 0"),
      unit: z.enum(["ml", "l"]),
    })
    .optional(),
  image: z.url("La imagen debe ser una URL válida").optional(),
  stock: z.number({ error: "El stock debe ser un número" }).int("El stock debe ser un número entero").min(0, "El stock no puede ser negativo"),
  // Especies a las que es apto (ej.: "perro", "gato"), normalizadas.
  petTypes: tagList(20).refine((t) => t.length > 0, "Debe indicar al menos un tipo de mascota"),
  // Tipos de dieta (texto libre, ej.: "proteica"), normalizados (RN-014).
  dietTypes: tagList(20).default([]),
  nutritionalInfo: NutritionalInfoSchema.optional(),
});

export type Product = z.infer<typeof ProductSchema>;
export type NutritionalInfo = z.infer<typeof NutritionalInfoSchema>;
