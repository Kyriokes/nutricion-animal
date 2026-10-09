import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { listDietsOfNutritionist } from "@/modules/dietas/repositorio";
import { hasPermission } from "@/modules/usuarios/roles";
import { getCurrentActor } from "@/modules/usuarios/sesion";

// VN-01: mis dietas (RN-021).
async function Content() {
  // Lee la sesión: siempre en el momento del pedido (DT-036).
  await connection();
  const actor = await getCurrentActor();
  if (!actor || !hasPermission(actor.roles, "diet.manage")) {
    return <p>Esta sección es para nutricionistas.</p>;
  }
  const diets = await listDietsOfNutritionist(actor.id);
  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link
          href="/dietas/nueva"
          className="inline-flex h-8 items-center rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/80"
        >
          Nueva dieta
        </Link>
      </div>
      {diets.length === 0 ? (
        <p className="text-muted-foreground">Todavía no creaste dietas.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {diets.map((d) => (
            <li key={d.id}>
              <Link href={`/dietas/${d.id}`} className="flex items-center justify-between gap-2 rounded-lg border p-4 hover:bg-muted">
                <span className="font-medium">{d.name}</span>
                <span className="text-sm text-muted-foreground">
                  Versión {d.latestVersion} · {d.activePets} mascota(s)
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function DietsPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-semibold">Mis dietas</h1>
      <Suspense fallback={<p className="text-muted-foreground">Cargando…</p>}>
        <Content />
      </Suspense>
    </main>
  );
}
