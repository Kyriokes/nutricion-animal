"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { updateUserByAdmin } from "@/modules/usuarios/repositorio";
import { getCurrentActor } from "@/modules/usuarios/sesion";

export type UpdateUserResult = { ok: true } | { ok: false; message: string };

const ERRORS: Record<string, string> = {
  not_allowed: "No tenés permiso para cambiar usuarios.",
  invalid: "Datos inválidos (la nota puede tener hasta 500 caracteres).",
  self_demotion: "No podés quitarte tu propio rol de administrador.",
  not_found: "El usuario no existe.",
};

// VA-10: roles y nota del admin. El permiso se verifica en el servidor.
export async function updateUserAction(
  targetId: unknown,
  input: unknown,
): Promise<UpdateUserResult> {
  const actor = await getCurrentActor();
  if (!actor) return { ok: false, message: "Tenés que ingresar." };
  const id = z.uuid().safeParse(targetId);
  if (!id.success) return { ok: false, message: ERRORS.not_found };
  try {
    const result = await updateUserByAdmin({ actor, targetId: id.data, input });
    if (!result.ok) return { ok: false, message: ERRORS[result.error] ?? "No se pudo guardar." };
  } catch {
    return { ok: false, message: "No se pudo guardar. Probá de nuevo." };
  }
  refresh();
  return { ok: true };
}
