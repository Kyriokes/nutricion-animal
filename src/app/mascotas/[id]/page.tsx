import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { z } from "zod";
import { DietContentView } from "@/components/diet-content-view";
import { listActiveDietsForPet } from "@/modules/dietas/repositorio";
import { canManagePet } from "@/modules/mascotas/formulario";
import { getPet, listKnownSpecies, type StoredPet } from "@/modules/mascotas/repositorio";
import { getCurrentActor } from "@/modules/usuarios/sesion";
import { DeletePetButton, PetForm, type PetFormValues } from "../pet-form";

const dateFormat = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeZone: "UTC" });

function toFormValues(p: StoredPet): PetFormValues {
  return {
    name: p.name,
    species: p.species,
    breed: p.breed ?? "",
    birthDate: p.birthDate ? p.birthDate.toISOString().slice(0, 10) : "",
    weightKg: p.weightKg != null ? String(p.weightKg).replace(".", ",") : "",
    healthConditions: p.healthConditions.join(", "),
    allergies: p.allergies.join(", "),
    forbiddenFoods: p.forbiddenFoods.join(", "),
    requiredFoods: p.requiredFoods.join(", "),
  };
}

// VU-04: detalle de la mascota con su "Dieta actual" (RN-015).
async function Content({ params }: { params: Promise<{ id: string }> }) {
  // Lee la sesión: siempre en el momento del pedido (DT-036).
  await connection();
  const actor = await getCurrentActor();
  const id = z.uuid().safeParse((await params).id);
  const pet = id.success ? await getPet(id.data) : null;
  if (!actor || !pet || !canManagePet(actor, pet)) {
    return <p className="text-muted-foreground">No encontramos esa mascota.</p>;
  }

  const [diets, species] = await Promise.all([listActiveDietsForPet(pet.id), listKnownSpecies()]);
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">{pet.name}</h1>
        <p className="text-muted-foreground">
          {pet.species}
          {pet.breed && ` · ${pet.breed}`}
          {pet.birthDate && ` · nació el ${dateFormat.format(pet.birthDate)}`}
          {pet.weightKg != null && ` · ${String(pet.weightKg).replace(".", ",")} kg`}
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Dieta actual</h2>
        {diets.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Todavía no tiene una dieta asignada por un nutricionista.
          </p>
        ) : (
          diets.map((d) => (
            <article key={d.assignmentId} className="flex flex-col gap-2 rounded-lg border p-4">
              <p className="font-medium">{d.dietName}</p>
              {/* RN-047: aviso en la misma dieta si quien la emitió se fue. */}
              {!d.issuerActive && (
                <p role="alert" className="rounded bg-warning px-2 py-1 text-sm text-warning-foreground">
                  Quien emitió esta dieta ya no forma parte de la plataforma. La
                  plataforma desaconseja continuarla: consultá con otro
                  nutricionista.
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                De {d.nutritionistName ?? "un nutricionista que ya no está en la plataforma"} ·
                versión {d.versionNumber} · desde el {dateFormat.format(d.assignedAt)}
              </p>
              <DietContentView content={d.content} />
            </article>
          ))
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Datos de la mascota</h2>
        <PetForm petId={pet.id} initial={toFormValues(pet)} species={species} />
      </section>

      <DeletePetButton petId={pet.id} />
    </div>
  );
}

export default function PetPage({ params }: PageProps<"/mascotas/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <Link href="/mascotas" className="text-sm underline-offset-4 hover:underline">
        ← Mis mascotas
      </Link>
      <Suspense fallback={<p className="text-muted-foreground">Cargando…</p>}>
        <Content params={params} />
      </Suspense>
    </main>
  );
}
