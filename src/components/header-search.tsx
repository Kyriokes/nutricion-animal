"use client";

import { Search } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";

// VP-06: buscador del encabezado. Busca en el catálogo desde cualquier
// página; es un formulario común, funciona sin JavaScript.
export function SearchForm({ q = "", petId }: { q?: string; petId?: string | null }) {
  return (
    <form
      action="/catalogo"
      role="search"
      className="flex h-10 w-full items-center overflow-hidden rounded-lg bg-background text-foreground focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-primary-foreground"
    >
      {/* RN-037: si se está comprando para una mascota, la búsqueda la conserva. */}
      {petId && <input type="hidden" name="mascota" value={petId} />}
      <input
        name="q"
        type="search"
        defaultValue={q}
        maxLength={80}
        aria-label="Buscar en el catálogo"
        placeholder="Buscar pollo, viandas, marcas…"
        className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground"
      />
      <button
        type="submit"
        aria-label="Buscar"
        className="flex h-full w-11 shrink-0 items-center justify-center border-l hover:bg-muted"
      >
        <Search className="size-4" aria-hidden />
      </button>
    </form>
  );
}

// En el catálogo muestra lo que se está buscando.
export function HeaderSearch() {
  const inCatalog = usePathname() === "/catalogo";
  const params = useSearchParams();
  const q = inCatalog ? (params.get("q") ?? "") : "";
  return <SearchForm key={q} q={q} petId={inCatalog ? params.get("mascota") : null} />;
}
