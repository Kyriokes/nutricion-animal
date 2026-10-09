import Link from "next/link";

// Navegación entre páginas de una lista ("← Anterior · Página 2 de 5 · Siguiente →").
export function Pager({ page, pages, hrefFor }: { page: number; pages: number; hrefFor: (page: number) => string }) {
  if (pages <= 1) return null;
  return (
    <nav aria-label="Páginas" className="flex items-center justify-center gap-4 text-sm">
      {page > 1 && (
        <Link href={hrefFor(page - 1)} className="underline">
          ← Anterior
        </Link>
      )}
      <span>
        Página {page} de {pages}
      </span>
      {page < pages && (
        <Link href={hrefFor(page + 1)} className="underline">
          Siguiente →
        </Link>
      )}
    </nav>
  );
}
