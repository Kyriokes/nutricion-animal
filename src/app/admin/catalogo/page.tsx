import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { NoAccess } from "@/components/no-access";
import { formatPrice } from "@/modules/catalogo/presentacion";
import { z } from "zod";
import { Pager } from "@/components/pager";
import { listProductsForAdmin } from "@/modules/catalogo/repositorio";
import { hasPermission } from "@/modules/usuarios/roles";
import { getCurrentActor } from "@/modules/usuarios/sesion";

const STATUS = { pending: "En revisión", approved: "Publicado", rejected: "Rechazado" } as const;

// Por defecto, de menor a mayor stock (RN-090); se puede ver lo más reciente.
const FilterSchema = z.object({
  orden: z.enum(["stock", "recientes"]).catch("stock"),
  pagina: z.coerce.number().int().min(1).max(10_000).catch(1),
});
type Sort = z.infer<typeof FilterSchema>["orden"];
const SORTS: { value: Sort; label: string }[] = [
  { value: "stock", label: "Menos stock primero" },
  { value: "recientes", label: "Modificados recientemente" },
];
const hrefFor = (orden: Sort, pagina = 1) => `/admin/catalogo?orden=${orden}${pagina > 1 ? `&pagina=${pagina}` : ""}`;

// VA-02: gestión del catálogo.
async function Content({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  const actor = await getCurrentActor();
  if (!actor || !hasPermission(actor.roles, "catalog.manage")) return <NoAccess />;
  const filter = FilterSchema.parse(await searchParams);
  const result = await listProductsForAdmin(filter.orden, filter.pagina);
  const products = result.items;
  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link
          href="/admin/catalogo/nuevo"
          className="inline-flex h-8 items-center rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/80"
        >
          Nuevo producto
        </Link>
      </div>
      <nav aria-label="Ordenar productos" className="flex flex-wrap gap-2 text-sm">
        {SORTS.map((o) => (
          <Link
            key={o.value}
            href={hrefFor(o.value)}
            aria-current={o.value === filter.orden ? "page" : undefined}
            className={
              o.value === filter.orden
                ? "rounded-full bg-primary px-3 py-1 text-primary-foreground"
                : "rounded-full border px-3 py-1 hover:bg-muted"
            }
          >
            {o.label}
          </Link>
        ))}
      </nav>
      {products.length === 0 ? (
        <p className="text-muted-foreground">Todavía no hay productos.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-2 font-normal">Producto</th>
                <th className="py-2 pr-2 font-normal">Precio</th>
                <th className="py-2 pr-2 font-normal">Stock</th>
                <th className="py-2 font-normal">Estado</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b">
                  <td className="py-2 pr-2">
                    <Link href={`/admin/catalogo/${p.id}`} className="font-medium underline-offset-4 hover:underline">
                      {p.name}
                    </Link>
                    <span className="block text-xs text-muted-foreground">{p.brand}</span>
                  </td>
                  <td className="py-2 pr-2 whitespace-nowrap">{formatPrice(p.price)}</td>
                  <td className={`py-2 pr-2 ${p.stock === 0 ? "text-destructive" : ""}`}>{p.stock}</td>
                  <td className="py-2">{STATUS[p.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager page={result.page} pages={result.pages} hrefFor={(n) => hrefFor(filter.orden, n)} />
    </div>
  );
}

export default function AdminCatalogPage({ searchParams }: PageProps<"/admin/catalogo">) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-semibold">Catálogo</h1>
      <Suspense fallback={<p className="text-muted-foreground">Cargando…</p>}>
        <Content searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
