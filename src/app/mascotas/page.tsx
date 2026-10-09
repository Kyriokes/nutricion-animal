import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { LoginDialog } from "@/components/login-dialog";
import { listKnownSpecies, listPetsByOwner } from "@/modules/mascotas/repositorio";
import { hasPermission } from "@/modules/usuarios/roles";
import { getCurrentActor } from "@/modules/usuarios/sesion";
import { PetForm } from "./pet-form";

// VU-03: mis mascotas (RN-010).
async function Content() {
  // Lee la sesión: siempre en el momento del pedido (DT-036).
  await connection();
  const actor = await getCurrentActor();
  if (!actor) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p>Ingresá para ver tus mascotas.</p>
        <LoginDialog />
      </div>
    );
  }
  if (!hasPermission(actor.roles, "pet.register")) {
    return <p>Tu cuenta no puede inscribir mascotas.</p>;
  }

  const [pets, species] = await Promise.all([listPetsByOwner(actor.id), listKnownSpecies()]);
  return (
    <div className="flex flex-col gap-8">
      {pets.length === 0 ? (
        <p className="text-muted-foreground">Todavía no cargaste mascotas.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {pets.map((p) => (
            <li key={p.id}>
              <Link href={`/mascotas/${p.id}`} className="flex flex-col rounded-lg border p-4 hover:bg-muted">
                <span className="font-medium">{p.name}</span>
                <span className="text-sm text-muted-foreground">
                  {p.species}
                  {p.breed && ` · ${p.breed}`}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Agregar una mascota</h2>
        <PetForm species={species} />
      </section>
    </div>
  );
}

export default function PetsPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-semibold">Mis mascotas</h1>
      <Suspense fallback={<p className="text-muted-foreground">Cargando…</p>}>
        <Content />
      </Suspense>
    </main>
  );
}
