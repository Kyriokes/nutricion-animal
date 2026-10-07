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

// Lo que cambia entre versiones de una dieta.
export const DietContentSchema = z.object({
  description: z.string().min(1, "La descripción es requerida"),
  foods: z.array(FoodItemSchema).min(1, "Al menos un alimento es requerido"),
  duration: DietDurationSchema,
  notes: z.string().optional(), // Aclaraciones, no afecta lógica
});

// RN-021: cada nutricionista tiene sus propias dietas; no se comparten.
// El nombre vive en la dieta, no en la versión: renombrar no crea versión.
export const DietSchema = z.object({
  id: z.uuid(),
  nutritionistId: z.uuid(),
  name: z.string().trim().min(1, "El nombre de la dieta es requerido"),
  createdAt: z.date(),
});

// RN-025: una dieta tiene versiones numeradas.
export const DietVersionSchema = z.object({
  id: z.uuid(),
  dietId: z.uuid(),
  number: z.number().int().min(1),
  content: DietContentSchema,
  createdAt: z.date(),
});

// RN-023: una mascota tiene asignada una versión concreta de una dieta.
// Al terminar una asignación se conserva con `endedAt` (historial).
export const DietAssignmentSchema = z.object({
  id: z.uuid(),
  petId: z.uuid(),
  dietVersionId: z.uuid(),
  assignedAt: z.date(),
  endedAt: z.date().optional(),
});

export type Diet = z.infer<typeof DietSchema>;
export type DietContent = z.infer<typeof DietContentSchema>;
export type DietVersion = z.infer<typeof DietVersionSchema>;
export type DietAssignment = z.infer<typeof DietAssignmentSchema>;
export type FoodItem = z.infer<typeof FoodItemSchema>;
export type FoodConsumptionPattern = z.infer<
  typeof FoodConsumptionPatternSchema
>;
export type DietDuration = z.infer<typeof DietDurationSchema>;
