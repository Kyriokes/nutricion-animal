import { hasPermission, type Actor } from "@/modules/usuarios/roles";
import { PetSchema, type Pet } from "./schema";

// "pollo, chocolate\nuvas" → ["pollo", "chocolate", "uvas"], sin vacíos ni
// repetidos (sin importar mayúsculas).
export function splitList(text: string): string[] {
  const seen = new Set<string>();
  return text
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter((s) => {
      const key = s.toLowerCase();
      if (!s || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

const LISTS = ["healthConditions", "allergies", "forbiddenFoods", "requiredFoods"] as const;

// RN-010: convierte el formulario (todo texto) en una mascota válida.
// La fecha llega como AAAA-MM-DD y el peso acepta coma decimal.
export function parsePetForm(
  form: Record<string, string | undefined>,
  ownerId: string,
): { ok: true; pet: Pet } | { ok: false; message: string } {
  const text = (k: string) => form[k]?.trim() ?? "";
  const weight = text("weightKg").replace(",", ".");
  const date = text("birthDate");

  const candidate = {
    ownerId,
    name: text("name"),
    species: text("species"),
    ...(text("breed") ? { breed: text("breed") } : {}),
    ...(date ? { birthDate: new Date(`${date}T00:00:00Z`) } : {}),
    ...(weight ? { weightKg: Number(weight) } : {}),
    ...Object.fromEntries(LISTS.map((k) => [k, splitList(form[k] ?? "")])),
  };
  const parsed = PetSchema.safeParse(candidate);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const message =
      issue?.path[0] === "weightKg"
        ? "El peso debe ser un número mayor a 0"
        : issue?.path[0] === "birthDate" && issue.code !== "custom"
          ? "La fecha de nacimiento no es válida"
          : (issue?.message ?? "Datos inválidos");
    return { ok: false, message };
  }
  return { ok: true, pet: parsed.data };
}

// La mascota la maneja su dueño (si su cuenta no está bloqueada) o el admin.
export function canManagePet(actor: Actor, pet: { ownerId: string }): boolean {
  if (actor.roles.includes("admin")) return true;
  return actor.id === pet.ownerId && hasPermission(actor.roles, "pet.register");
}
