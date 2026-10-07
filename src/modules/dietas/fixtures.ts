import type { Actor } from "@/modules/usuarios/roles";
import type { Diet, DietAssignment, DietContent, DietVersion } from "./schema";

// Datos de prueba compartidos por los tests del módulo.
export const NOW = new Date("2026-10-07T12:00:00Z");

export const owner: Actor = { id: "nut-1", roles: ["customer", "nutritionist"] };
export const otherNutritionist: Actor = {
  id: "nut-2",
  roles: ["customer", "nutritionist"],
};
export const customer: Actor = { id: "nut-1", roles: ["customer"] };
export const blocked: Actor = { id: "nut-1", roles: [] };

export const content: DietContent = {
  description: "Alta en proteína",
  foods: [
    {
      name: "Pollo",
      quantity: 100,
      unit: "g",
      pattern: { type: "weekly", timesPerWeek: 3 },
    },
  ],
  duration: { type: "indefinite" },
};

export const newContent: DietContent = {
  ...content,
  description: "Alta en proteína, sin pollo",
  foods: [{ ...content.foods[0], name: "Pescado" }],
};

export const diet: Diet = {
  id: "diet-1",
  nutritionistId: owner.id,
  name: "Dieta proteica",
  createdAt: NOW,
};

export const v1: DietVersion = {
  id: "v1",
  dietId: diet.id,
  number: 1,
  content,
  createdAt: NOW,
};

export function assignment(
  id: string,
  petId: string,
  dietVersionId: string,
  endedAt?: Date,
): DietAssignment {
  return { id, petId, dietVersionId, assignedAt: NOW, endedAt };
}

export function idGenerator(prefix = "id") {
  let n = 0;
  return () => `${prefix}${++n}`;
}
