"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { canManagePet, parsePetForm } from "@/modules/mascotas/formulario";
import { createPet, deletePet, getPet, updatePet } from "@/modules/mascotas/repositorio";
import { hasPermission } from "@/modules/usuarios/roles";
import { getCurrentActor } from "@/modules/usuarios/sesion";

export type PetActionResult = { ok: true } | { ok: false; message: string };

const FormSchema = z.record(z.string(), z.string());

// RN-010: alta (petId null) o edición de una mascota.
export async function savePetAction(petId: string | null, input: unknown): Promise<PetActionResult> {
  const actor = await getCurrentActor();
  if (!actor) return { ok: false, message: "Tenés que ingresar." };
  const form = FormSchema.safeParse(input);
  if (!form.success) return { ok: false, message: "Datos inválidos." };

  let ownerId = actor.id;
  if (petId) {
    const existing = z.uuid().safeParse(petId).success ? await getPet(petId) : null;
    if (!existing) return { ok: false, message: "La mascota no existe." };
    if (!canManagePet(actor, existing)) return { ok: false, message: "No podés editar esta mascota." };
    ownerId = existing.ownerId;
  } else if (!hasPermission(actor.roles, "pet.register")) {
    return { ok: false, message: "Tu cuenta no puede inscribir mascotas." };
  }

  const parsed = parsePetForm(form.data, ownerId);
  if (!parsed.ok) return parsed;
  try {
    if (petId) await updatePet(petId, parsed.pet);
    else await createPet(parsed.pet);
  } catch {
    return { ok: false, message: "No se pudo guardar. Probá de nuevo." };
  }
  refresh();
  return { ok: true };
}

// Borrar una mascota también borra sus asignaciones de dietas.
export async function deletePetAction(petId: unknown): Promise<PetActionResult> {
  const actor = await getCurrentActor();
  if (!actor) return { ok: false, message: "Tenés que ingresar." };
  const id = z.uuid().safeParse(petId);
  const pet = id.success ? await getPet(id.data) : null;
  if (!pet) return { ok: false, message: "La mascota no existe." };
  if (!canManagePet(actor, pet)) return { ok: false, message: "No podés borrar esta mascota." };
  try {
    await deletePet(pet.id);
  } catch {
    return { ok: false, message: "No se pudo borrar. Probá de nuevo." };
  }
  redirect("/mascotas");
}
