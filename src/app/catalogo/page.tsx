import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { z } from "zod";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { listCatalog, listCatalogFacets, type CatalogFilters } from "@/modules/catalogo/repositorio";
import { listPetsByOwner } from "@/modules/mascotas/repositorio";
import { getCurrentUser } from "@/modules/usuarios/sesion";

// Filtros que llegan en la URL; lo inválido se ignora.
const FiltersSchema = z.object({
  q: z.string().trim().max(80).optional().catch(undefined),
  especie: z.string().trim().max(40).optional().catch(undefined),
  dieta: z.string().trim().max(40).optional().catch(undefined),
  pagina: z.coerce.number().int().min(1).max(1000).optional().catch(undefined),
});

const selectClass =
  "h-8 rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function hrefWith(params: Record<string, string | undefined>) {
  const qs = new URLSearchParams(
    Object.entries(params).filter((e): e is [string, string] => Boolean(e[1])),
  ).toString();
  return qs ? `/catalogo?${qs}` : "/catalogo";
}

// RN-013: atajos para filtrar por las especies de las mascotas del usuario.
async function MyPetsShortcuts({ current }: { current?: string }) {
  // Lee la sesión: siempre en el momento del pedido (DT-036).
  await connection();
  const user = await getCurrentUser();
  if (!user) return null;
  const species = [...new Set((await listPetsByOwner(user.id)).map((p) => p.species.toLowerCase()))];
  if (species.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-muted-foreground">Para tus mascotas:</span>
      {species.map((s) => (
        <Link
          key={s}
          href={hrefWith({ especie: s })}
          className={`rounded-full border px-2.5 py-0.5 ${current === s ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
        >
          {s}
        </Link>
      ))}
    </div>
  );
}

// VP-04: catálogo con búsqueda (VP-06) y filtros por especie y dieta.
async function Catalog({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams;
  const f = FiltersSchema.parse({
    q: typeof raw.q === "string" ? raw.q : undefined,
    especie: typeof raw.especie === "string" ? raw.especie : undefined,
    dieta: typeof raw.dieta === "string" ? raw.dieta : undefined,
    pagina: typeof raw.pagina === "string" ? raw.pagina : undefined,
  });
  const filters: CatalogFilters = { q: f.q, species: f.especie, dietType: f.dieta, page: f.pagina };
  const [result, facets] = await Promise.all([listCatalog(filters), listCatalogFacets()]);
  const current = { q: f.q, especie: f.especie, dieta: f.dieta };

  return (
    <div className="flex flex-col gap-6">
      <form action="/catalogo" className="flex flex-wrap items-end gap-2" role="search">
        <label className="flex min-w-56 flex-1 flex-col gap-1 text-sm">
          Buscar
          <input
            name="q"
            defaultValue={f.q}
            maxLength={80}
            placeholder="Pollo, croquetas, marca…"
            className={selectClass}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Mascota
          <select name="especie" defaultValue={f.especie ?? ""} className={selectClass}>
            <option value="">Todas</option>
            {facets.species.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Tipo de dieta
          <select name="dieta" defaultValue={f.dieta ?? ""} className={selectClass}>
            <option value="">Todos</option>
            {facets.dietTypes.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </label>
        <Button type="submit">Buscar</Button>
        {(f.q || f.especie || f.dieta) && (
          <Link href="/catalogo" className="text-sm underline underline-offset-4">
            Limpiar
          </Link>
        )}
      </form>

      <Suspense fallback={null}>
        <MyPetsShortcuts current={f.especie?.toLowerCase()} />
      </Suspense>

      {result.items.length === 0 ? (
        <p className="text-muted-foreground">No encontramos productos con esos filtros.</p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {result.total} producto{result.total === 1 ? "" : "s"}
          </p>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {result.items.map((p) => (
              <li key={p.id} className="flex">
                <ProductCard product={p} />
              </li>
            ))}
          </ul>
        </>
      )}

      {result.pages > 1 && (
        <nav aria-label="Páginas" className="flex items-center justify-center gap-4 text-sm">
          {result.page > 1 && (
            <Link href={hrefWith({ ...current, pagina: String(result.page - 1) })} className="underline">
              ← Anterior
            </Link>
          )}
          <span>
            Página {result.page} de {result.pages}
          </span>
          {result.page < result.pages && (
            <Link href={hrefWith({ ...current, pagina: String(result.page + 1) })} className="underline">
              Siguiente →
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}

export default function CatalogPage({ searchParams }: PageProps<"/catalogo">) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-semibold">Catálogo</h1>
      <Suspense fallback={<p className="text-muted-foreground">Cargando productos…</p>}>
        <Catalog searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
