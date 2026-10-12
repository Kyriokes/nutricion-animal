import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { listDietsOfNutritionist } from "@/modules/dietas/repositorio";
import { hasPermission } from "@/modules/usuarios/roles";
import { getCurrentActor } from "@/modules/usuarios/sesion";

const inputClass =
  "h-8 rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

// VN-01: mis dietas (RN-021), cada una con su paciente (RN-023).
async function Content({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = (await searchParams).q;
  const q = z.string().trim().max(80).catch("").parse(typeof raw === "string" ? raw : "");
  // Lee la sesión: siempre en el momento del pedido (DT-036).
  await connection();
  const actor = await getCurrentActor();
  if (!actor || !hasPermission(actor.roles, "diet.manage")) {
    return <p>Esta sección es para nutricionistas.</p>;
  }
  const diets = await listDietsOfNutritionist(actor.id, { q });
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/dietas/nueva"
          className="inline-flex h-8 items-center rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/80"
        >
          Nueva dieta
        </Link>
        <form action="/dietas" role="search" className="flex flex-wrap items-center gap-2">
          <input
            name="q"
            defaultValue={q}
            maxLength={80}
            aria-label="Buscar por nombre de la dieta o del paciente"
            placeholder="Dieta o paciente"
            className={inputClass}
          />
          <Button type="submit" size="sm" variant="secondary">
            Buscar
          </Button>
          {q && (
            <Link href="/dietas" className="text-sm underline underline-offset-4">
              Limpiar
            </Link>
          )}
        </form>
      </div>
      {diets.length === 0 ? (
        <p className="text-muted-foreground">
          {q ? "No encontramos dietas con ese nombre o paciente." : "Todavía no creaste dietas."}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {diets.map((d) => (
            <li key={d.id}>
              <Link href={`/dietas/${d.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-4 hover:bg-muted">
                <span className="font-medium">{d.name}</span>
                <span className="text-sm text-muted-foreground">
                  {d.patientName ? `${d.patientName}${d.active ? "" : " (terminada)"}` : "Sin paciente"} · versión{" "}
                  {d.latestVersion}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function DietsPage({ searchParams }: PageProps<"/dietas">) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-semibold">Mis dietas</h1>
      <Suspense fallback={<p className="text-muted-foreground">Cargando…</p>}>
        <Content searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
