import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { z } from "zod";
import { Pager } from "@/components/pager";
import { PetProductCard, ProductCard } from "@/components/product-card";
import { pageWithin } from "@/lib/paginas";
import { rankForPet } from "@/modules/catalogo/mascota";
import { speciesLabel } from "@/modules/catalogo/presentacion";
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

function hrefWith(params: Record<string, string | undefined>) {
  const qs = new URLSearchParams(
    Object.entries(params).filter((e): e is [string, string] => Boolean(e[1])),
  ).toString();
  return qs ? `/catalogo?${qs}` : "/catalogo";
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// "Dieta: Mantenimiento", "2 dietas" o "sin dieta asignada".
const dietLabel = (names: readonly string[]) =>
  names.length === 0 ? "sin dieta asignada" : names.length === 1 ? `Dieta: ${names[0]}` : `${names.length} dietas`;

type FilterOption = { label: string; detail?: string; href: string; active: boolean };

// Un grupo de filtros: lista en la columna de la izquierda; en pantallas
// chicas, etiquetas en fila. Tocar el que está elegido lo quita.
function FilterGroup({ title, options }: { title: string; options: FilterOption[] }) {
  if (options.length === 0) return null;
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-bold">{title}</h2>
      <ul className="flex flex-wrap gap-1.5 lg:flex-col lg:gap-0.5">
        {options.map((o) => (
          <li key={o.href}>
            <Link
              href={o.href}
              aria-current={o.active ? "true" : undefined}
              className={`inline-flex flex-col rounded-full border px-3 py-1 text-sm lg:flex lg:rounded-md lg:px-2 lg:py-1.5 ${
                o.active
                  ? "border-primary bg-primary font-medium text-primary-foreground"
                  : "hover:bg-muted lg:border-transparent"
              }`}
            >
              {o.label}
              {o.detail && <span className="text-xs opacity-80">{o.detail}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

// VP-04: catálogo con filtros por especie y tipo de dieta, y por mascota
// (RN-013, RN-037). La búsqueda por texto (VP-06) está en el encabezado.
// Con sesión se leen las mascotas del usuario (DT-036).
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
  // Con una mascota elegida, la especie es la de ella.
  const current = { q: f.q, especie: selected ? undefined : f.especie, dieta: f.dieta, mascota: selected?.pet.id };
  const filtered = Boolean(current.especie || current.dieta || current.mascota);

  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold">{f.q ? `Resultados para "${f.q}"` : "Catálogo"}</h1>
        {f.q && (
          <Link href={hrefWith({ ...current, q: undefined })} className="self-start text-sm underline underline-offset-4">
            Quitar la búsqueda
          </Link>
        )}
      </div>
      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
        <aside aria-label="Filtros" className="flex flex-col gap-5 lg:w-56 lg:shrink-0">
          <FilterGroup
            title="Para tus mascotas"
            options={myPets.map(({ pet, dietNames }) => ({
              label: pet.name,
              detail: dietLabel(dietNames),
              href: hrefWith({ q: f.q, dieta: f.dieta, mascota: selected?.pet.id === pet.id ? undefined : pet.id }),
              active: selected?.pet.id === pet.id,
            }))}
          />
          {!selected && (
            <FilterGroup
              title="Especie"
              options={facets.species.map((s) => ({
                label: speciesLabel(s),
                href: hrefWith({ ...current, especie: f.especie === s ? undefined : s }),
                active: f.especie === s,
              }))}
            />
          )}
          <FilterGroup
            title="Tipo de dieta"
            options={facets.dietTypes.map((d) => ({
              label: capitalize(d),
              href: hrefWith({ ...current, dieta: f.dieta === d ? undefined : d }),
              active: f.dieta === d,
            }))}
          />
          {filtered && (
            <Link href={hrefWith({ q: f.q })} className="self-start text-sm underline underline-offset-4">
              Limpiar filtros
            </Link>
          )}
        </aside>
        <div className="flex min-w-0 flex-1 flex-col gap-4">
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
      </div>
    </>
  );
}

const gridClass = "grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4";

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
          <ul className={gridClass}>
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
      <section className="flex flex-col gap-1 rounded-xl border bg-secondary p-3 text-sm text-secondary-foreground">
        <p>
          Productos para <strong>{pet.name}</strong> ({pet.species}) · {dietLabel(dietNames)}
          {dietNames.length > 1 && `: ${dietNames.join(", ")}`} ·{" "}
          <Link href={`/mascotas/${pet.id}`} className="underline underline-offset-4">
            ver su ficha
          </Link>
        </p>
        <p>Es una ayuda para elegir: verificá siempre la etiqueta y consultá a su nutricionista.</p>
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
        <ul className={gridClass}>
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
      <Suspense fallback={<p className="text-muted-foreground">Cargando productos…</p>}>
        <Catalog searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
