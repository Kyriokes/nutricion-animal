"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { FoodNameSchema } from "@/modules/alimentos/nombres";
import { addFoodAlias, mergeFoods, removeFoodAlias, renameFood } from "@/modules/alimentos/repositorio";
import { hasPermission } from "@/modules/usuarios/roles";
import { getCurrentActor } from "@/modules/usuarios/sesion";

export type FoodAdminResult = { ok: true } | { ok: false; message: string };

const ERRORS = {
  not_found: "No encontramos ese alimento.",
  taken: "Ese nombre ya es de otro alimento o sinónimo.",
  same: "Elegí un alimento distinto.",
} as const;

async function canManage(): Promise<boolean> {
  const actor = await getCurrentActor();
  return !!actor && hasPermission(actor.roles, "food.manage");
}

async function run(fn: () => Promise<{ ok: true } | { ok: false; error: keyof typeof ERRORS }>): Promise<FoodAdminResult> {
  try {
    const r = await fn();
    if (!r.ok) return { ok: false, message: ERRORS[r.error] };
  } catch {
    return { ok: false, message: "No se pudo guardar. Probá de nuevo." };
  }
  refresh();
  return { ok: true };
}

const NO_PERMISSION: FoodAdminResult = { ok: false, message: "No tenés permiso para administrar alimentos." };

// RN-032: renombrar un alimento.
export async function renameFoodAction(id: unknown, name: unknown): Promise<FoodAdminResult> {
  if (!(await canManage())) return NO_PERMISSION;
  const input = z.object({ id: z.uuid(), name: FoodNameSchema }).safeParse({ id, name });
  if (!input.success) return { ok: false, message: input.error.issues[0]?.message ?? "Datos inválidos." };
  return run(() => renameFood(input.data.id, input.data.name));
}

// RN-032: sumar un sinónimo ("pechuga de pollo" → pollo).
export async function addAliasAction(foodId: unknown, alias: unknown): Promise<FoodAdminResult> {
  if (!(await canManage())) return NO_PERMISSION;
  const input = z.object({ foodId: z.uuid(), alias: FoodNameSchema }).safeParse({ foodId, alias });
  if (!input.success) return { ok: false, message: input.error.issues[0]?.message ?? "Datos inválidos." };
  return run(() => addFoodAlias(input.data.foodId, input.data.alias));
}

export async function removeAliasAction(aliasId: unknown): Promise<FoodAdminResult> {
  if (!(await canManage())) return NO_PERMISSION;
  const id = z.uuid().safeParse(aliasId);
  if (!id.success) return { ok: false, message: "Datos inválidos." };
  return run(async () => {
    await removeFoodAlias(id.data);
    return { ok: true };
  });
}

// RN-032: unir un duplicado a otro alimento.
export async function mergeFoodAction(fromId: unknown, intoId: unknown): Promise<FoodAdminResult> {
  if (!(await canManage())) return NO_PERMISSION;
  const input = z.object({ fromId: z.uuid(), intoId: z.uuid() }).safeParse({ fromId, intoId });
  if (!input.success) return { ok: false, message: "Datos inválidos." };
  return run(() => mergeFoods(input.data.fromId, input.data.intoId));
}
