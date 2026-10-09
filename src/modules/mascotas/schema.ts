import { z } from "zod";

const foodList = z.array(z.string().trim().min(1).max(60)).max(30).default([]);

const normalize = (food: string) => food.trim().toLowerCase();

// RN-010: el cliente inscribe a sus mascotas.
export const PetSchema = z
  .object({
    id: z.uuid().optional(), // Generado por la BD
    ownerId: z.uuid(),
    name: z.string().trim().min(1, "El nombre es requerido").max(60, "El nombre puede tener hasta 60 caracteres"),
    // Texto libre por ahora; RN-013 (filtrar productos por mascota) necesitará
    // una lista cerrada de especies que coincida con la de los productos.
    species: z.string().trim().min(1, "La especie es requerida").max(40, "La especie puede tener hasta 40 caracteres"),
    breed: z.string().trim().min(1).max(60, "La raza puede tener hasta 60 caracteres").optional(),
    birthDate: z
      .date()
      .refine((d) => d <= new Date(), "La fecha de nacimiento no puede ser futura")
      .optional(),
    weightKg: z.number().positive("El peso debe ser mayor a 0").optional(),
    healthConditions: foodList,
    allergies: foodList,
    forbiddenFoods: foodList,
    // Alimentos que la mascota necesita incluir en su alimentación.
    requiredFoods: foodList,
  })
  .refine(
    (pet) => {
      const required = new Set(pet.requiredFoods.map(normalize));
      return ![...pet.allergies, ...pet.forbiddenFoods].some((food) =>
        required.has(normalize(food)),
      );
    },
    {
      message: "Un alimento no puede ser a la vez necesario y prohibido o alergénico",
      path: ["requiredFoods"],
    },
  );

export type Pet = z.infer<typeof PetSchema>;
