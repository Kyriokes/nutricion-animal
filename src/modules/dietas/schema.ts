import { z } from "zod";

// Patrón de consumo de un alimento dentro de una dieta.
export const FoodConsumptionPatternSchema = z.union([
  z.object({
    type: z.literal("weekly"),
    timesPerWeek: z.number().int().min(1).max(7),
  }),
  z.object({
    type: z.literal("daily_cycle"),
    // Cada N días (N < 10), volviendo a repetir desde el día 1.
    cycleDays: z.number().int().min(1).max(9),
  }),
]);

// Un alimento con su patrón de consumo.
export const FoodItemSchema = z.object({
  name: z.string().min(1, "El alimento no puede estar vacío"),
  quantity: z.number().positive("La cantidad debe ser positiva"),
  unit: z.enum(["g", "kg", "ml", "l", "taza", "cucharada"]),
  pattern: FoodConsumptionPatternSchema,
});

// Duración de la dieta.
export const DietDurationSchema = z.union([
  z.object({
    type: z.literal("days"),
    days: z.number().int().min(1).max(999),
  }),
  z.object({
    type: z.literal("indefinite"),
  }),
]);

// Dieta genérica o específica (lo que carga un nutricionista).
export const DietSchema = z.object({
  id: z.string().uuid().optional(), // Generado por la BD
  nutritionistId: z.string().uuid(), // El nutricionista que la creó
  name: z.string().min(1, "El nombre de la dieta es requerido"),
  description: z.string().min(1, "La descripción es requerida"),
  foods: z.array(FoodItemSchema).min(1, "Al menos un alimento es requerido"),
  duration: DietDurationSchema,
  notes: z.string().optional(), // Aclaraciones, no afecta lógica
  createdAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

export type Diet = z.infer<typeof DietSchema>;
export type FoodItem = z.infer<typeof FoodItemSchema>;
export type FoodConsumptionPattern = z.infer<
  typeof FoodConsumptionPatternSchema
>;
export type DietDuration = z.infer<typeof DietDurationSchema>;
