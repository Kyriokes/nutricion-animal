import { z } from "zod";

// Información nutricional de un producto (opcional).
export const NutritionalInfoSchema = z.object({
  protein: z.number().min(0).max(100).optional(), // Porcentaje
  fat: z.number().min(0).max(100).optional(),
  fiber: z.number().min(0).max(100).optional(),
  ash: z.number().min(0).max(100).optional(),
  moisture: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
});

// Producto en el catálogo.
export const ProductSchema = z.object({
  id: z.string().uuid().optional(), // Generado por la BD
  name: z.string().min(1, "El nombre del producto es requerido"),
  description: z.string().min(1, "La descripción es requerida"),
  price: z.number().positive("El precio debe ser mayor a 0"),
  brand: z.string().min(1, "La marca es requerida"),
  weight: z.object({
    value: z.number().positive(),
    unit: z.enum(["g", "kg"]),
  }),
  volume: z
    .object({
      value: z.number().positive(),
      unit: z.enum(["ml", "l"]),
    })
    .optional(),
  image: z.string().url("La imagen debe ser una URL válida"),
  stock: z.number().int().min(0, "El stock no puede ser negativo"),
  // Tipos de mascota a las que es apto (ej: "perro", "gato").
  petTypes: z.array(z.string()).min(1, "Debe indicar al menos un tipo de mascota"),
  // Referencias a tipos de dieta (puede ser texto libre o IDs de dietas).
  dietTypes: z.array(z.string()).optional(),
  // Tabla nutricional (opcional).
  nutritionalInfo: NutritionalInfoSchema.optional(),
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type Product = z.infer<typeof ProductSchema>;
export type NutritionalInfo = z.infer<typeof NutritionalInfoSchema>;
