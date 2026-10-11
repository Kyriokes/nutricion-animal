import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { z } from "zod";
import { NoAccess } from "@/components/no-access";
import { Pager } from "@/components/pager";
import { Button } from "@/components/ui/button";
import { listFoodsForAdmin } from "@/modules/alimentos/repositorio";
import { hasPermission } from "@/modules/usuarios/roles";
import { getCurrentActor } from "@/modules/usuarios/sesion";

const FilterSchema = z.object({
  q: z.string().max(60).catch(""),
  pagina: z.coerce.number().int().min(1).max(10_000).catch(1),
});

const hrefFor = (q: string, pagina: number) =>
  `/admin/alimentos?${new URLSearchParams({ ...(q ? { q } : {}), ...(pagina > 1 ? { pagina: String(pagina) } : {}) })}`;

// RN-032: lista de alimentos para ordenarla (renombrar, sinónimos, unir duplicados).
async function Content({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  const actor = await getCurrentActor();
  if (!actor || !hasPermission(actor.roles, "food.manage")) return <NoAccess />;
  const filter = FilterSchema.parse(await searchParams);
  const result = await listFoodsForAdmin(filter.q, filter.pagina);

  return (
    <div className="flex flex-col gap-4">
      <form action="/admin/alimentos" className="flex flex-wrap items-end gap-2" role="search">
        <label className="flex flex-col gap-1 text-sm">
          Buscar
          <input
            name="q"
            defaultValue={filter.q}
            maxLength={60}
            className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
          />
        </label>
        <Button type="submit" variant="outline">
          Buscar
        </Button>
      </form>
      <p className="text-sm text-muted-foreground">
        {result.total} alimento{result.total === 1 ? "" : "s"}
      </p>
      <ul className="flex flex-col gap-1">
        {result.foods.map((f) => (
          <li key={f.id} className="flex flex-wrap items-baseline gap-2 border-b py-1 text-sm">
            <Link href={`/admin/alimentos/${f.id}`} className="font-medium underline-offset-4 hover:underline">
              {f.name}
            </Link>
            {f.aliases.length > 0 && (
              <span className="text-muted-foreground">también: {f.aliases.map((a) => a.alias).join(", ")}</span>
            )}
          </li>
        ))}
      </ul>
      <Pager page={result.page} pages={result.pages} hrefFor={(n) => hrefFor(filter.q, n)} />
    </div>
  );
}

export default function AdminFoodsPage({ searchParams }: PageProps<"/admin/alimentos">) {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-semibold">Alimentos</h1>
      <Suspense fallback={<p className="text-muted-foreground">Cargando…</p>}>
        <Content searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
