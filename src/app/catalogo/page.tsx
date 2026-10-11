import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { z } from "zod";
import { Pager } from "@/components/pager";
import { PetProductCard, ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { pageWithin } from "@/lib/paginas";
import { rankForPet } from "@/modules/catalogo/mascota";
import { normalizeTag } from "@/modules/catalogo/schema";
import {
  getProductFoods,
  listCatalog,
  listCatalogFacets,
  listCatalogForPet,
  PAGE_SIZE,
  type CatalogFilters,
} from "@/modules/catalogo/repositorio";
import { listPetProfiles, type PetWithProfile } from "@/modules/mascotas/repositorio";
import { getCurrentUser } from "@/modules/usuarios/sesion";

// Filtros que llegan en la URL; lo inválido se ignora.
const FiltersSchema = z.object({
  q: z.string().trim().max(80).optional().catch(undefined),
  especie: z.string().trim().max(40).optional().catch(undefined),
  dieta: z.string().trim().max(40).optional().catch(undefined),
  // RN-037: id de una mascota propia.
  mascota: z.uuid().optional().catch(undefined),
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

// "Dieta: Mantenimiento", "2 dietas" o "sin dieta asignada".
const dietLabel = (names: readonly string[]) =>
  names.length === 0 ? "sin dieta asignada" : names.length === 1 ? `Dieta: ${names[0]}` : `${names.length} dietas`;

// RN-013, RN-037: un atajo por mascota, con su nombre y su dieta. Tocar el
// que está elegido lo quita.
function MyPetsShortcuts({ pets, current }: { pets: PetWithProfile[]; current?: string }) {
  if (pets.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-muted-foreground">Para tus mascotas:</span>
      {pets.map(({ pet, dietNames }) => (
        <Link
          key={pet.id}
          href={current === pet.id ? "/catalogo" : hrefWith({ mascota: pet.id })}
          aria-current={current === pet.id ? "true" : undefined}
          className={`rounded-full border px-2.5 py-0.5 ${current === pet.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
        >
          {pet.name} · {dietLabel(dietNames)}
        </Link>
      ))}
    </div>
  );
}

// VP-04: catálogo con búsqueda (VP-06), filtros por especie y dieta, y por
// mascota (RN-037). Con sesión se leen las mascotas del usuario (DT-036).
async function Catalog({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams;
  const one = (k: string) => (typeof raw[k] === "string" ? raw[k] : undefined);
  const f = FiltersSchema.parse({
    q: one("q"),
    especie: one("especie"),
    dieta: one("dieta"),
    mascota: one("mascota"),
    pagina: one("pagina"),
  });
  await connection();
  const user = await getCurrentUser();
  const [myPets, facets] = await Promise.all([user ? listPetProfiles(user.id) : [], listCatalogFacets()]);
  // Solo una mascota propia; cualquier otro id se ignora.
  const selected = myPets.find((p) => p.pet.id === f.mascota);

  return (
    <div className="flex flex-col gap-6">
      <form action="/catalogo" className="flex flex-wrap items-end gap-2" role="search">
        {selected && <input type="hidden" name="mascota" value={selected.pet.id} />}
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
        {!selected && (
          <label className="flex flex-col gap-1 text-sm">
            Especie
            <select name="especie" defaultValue={f.especie ?? ""} className={selectClass}>
              <option value="">Todas</option>
              {facets.species.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="flex flex-col gap-1 text-sm">
          Tipo de dieta
          <select name="dieta" defaultValue={f.dieta ?? ""} className={selectClass}>
            <option value="">Todos</option>
            {facets.dietTypes.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit">Buscar</Button>
        {(f.q || f.especie || f.dieta || selected) && (
          <Link href="/catalogo" className="text-sm underline underline-offset-4">
            Limpiar
          </Link>
        )}
      </form>

      <MyPetsShortcuts pets={myPets} current={selected?.pet.id} />

      {selected ? (
        <PetResults
          selected={selected}
          q={f.q}
          dieta={f.dieta}
          page={f.pagina ?? 1}
          knownSpecies={facets.species}
        />
      ) : (
        <AllResults filters={{ q: f.q, species: f.especie, dietType: f.dieta, page: f.pagina }} />
      )}
    </div>
  );
}

async function AllResults({ filters }: { filters: CatalogFilters }) {
  const result = await listCatalog(filters);
  const current = { q: filters.q, especie: filters.species, dieta: filters.dietType };
  return (
    <>
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
      <Pager page={result.page} pages={result.pages} hrefFor={(n) => hrefWith({ ...current, pagina: String(n) })} />
    </>
  );
}

// RN-037, RN-038: productos de la especie de la mascota, primero los que
// aportan de su dieta y de sus alimentos de necesidad; los que no puede comer
// aparecen tapados con la advertencia.
async function PetResults({
  selected,
  q,
  dieta,
  page,
  knownSpecies,
}: {
  selected: PetWithProfile;
  q?: string;
  dieta?: string;
  page: number;
  knownSpecies: readonly string[];
}) {
  const { pet, dietNames, profile } = selected;
  const products = await listCatalogForPet({ q, species: pet.species, dietType: dieta });
  const foods = await getProductFoods(products.map((p) => p.id));
  const ranked = rankForPet(
    products.map((product) => ({ product, foods: foods.get(product.id)! })),
    profile,
  );
  const { page: current, pages } = pageWithin(page, ranked.length, PAGE_SIZE);
  const items = ranked.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  return (
    <>
      <section className="flex flex-col gap-1 rounded-lg border p-3 text-sm">
        <p>
          Productos para <strong>{pet.name}</strong> ({pet.species}) · {dietLabel(dietNames)}
          {dietNames.length > 1 && `: ${dietNames.join(", ")}`} ·{" "}
          <Link href={`/mascotas/${pet.id}`} className="underline underline-offset-4">
            ver su ficha
          </Link>
        </p>
        <p className="text-muted-foreground">
          Es una ayuda para elegir: verificá siempre la etiqueta y consultá a su nutricionista.
        </p>
      </section>
      {items.length === 0 && !knownSpecies.includes(normalizeTag(pet.species)) ? (
        <p role="note" className="text-sm">
          La especie de {pet.name} (&quot;{pet.species}&quot;) no coincide con las del catálogo ({knownSpecies.join(", ")}).{" "}
          <Link href={`/mascotas/${pet.id}`} className="underline underline-offset-4">
            Corregila en su ficha
          </Link>{" "}
          para ver sus productos.
        </p>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground">No encontramos productos para {pet.name} con esos filtros.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map(({ product, evaluation }) => (
            <li key={product.id} className="flex">
              <PetProductCard product={product} pet={{ id: pet.id, name: pet.name }} evaluation={evaluation} />
            </li>
          ))}
        </ul>
      )}
      <Pager page={current} pages={pages} hrefFor={(n) => hrefWith({ q, dieta, mascota: pet.id, pagina: String(n) })} />
    </>
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
