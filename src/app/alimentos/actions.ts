"use server";

import { z } from "zod";
import { FoodNameSchema } from "@/modules/alimentos/nombres";
import { addFood, searchFoods, type AddFoodResult, type Food } from "@/modules/alimentos/repositorio";
import { hasPermission } from "@/modules/usuarios/roles";
import { getCurrentActor } from "@/modules/usuarios/sesion";

// RN-032: buscar alimentos para el selector. Solo con sesión (lo usan los
// formularios de productos, dietas y mascotas).
export async function searchFoodsAction(query: unknown): Promise<Food[]> {
  const actor = await getCurrentActor();
  if (!actor || !hasPermission(actor.roles, "food.add")) return [];
  const q = z.string().max(60).safeParse(query);
  if (!q.success) return [];
  try {
    return await searchFoods(q.data);
  } catch {
    return [];
  }
}

export type AddFoodActionResult = AddFoodResult | { status: "error"; message: string };

// RN-032: agregar un alimento a la lista. Si se parece a otros, los devuelve
// para avisar; con `force`, lo agrega igual.
export async function addFoodAction(name: unknown, force: unknown): Promise<AddFoodActionResult> {
  const actor = await getCurrentActor();
  if (!actor || !hasPermission(actor.roles, "food.add")) {
    return { status: "error", message: "No podés agregar alimentos." };
  }
  const parsed = FoodNameSchema.safeParse(name);
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Nombre inválido." };
  try {
    return await addFood(parsed.data, actor.id, force === true);
  } catch {
    return { status: "error", message: "No se pudo agregar. Probá de nuevo." };
  }
}
