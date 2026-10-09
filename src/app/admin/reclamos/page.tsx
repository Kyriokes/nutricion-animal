import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { NoAccess } from "@/components/no-access";
import { Pager } from "@/components/pager";
import { orderNumber } from "@/modules/pedidos/presentacion";
import {
  AdminClaimFilterSchema,
  CLAIM_STATUS_LABELS,
  CLAIM_STATUSES,
  claimStatusesFor,
  type ClaimFilter,
} from "@/modules/pedidos/reclamos";
import { listClaims } from "@/modules/pedidos/repositorio";
import { hasPermission } from "@/modules/usuarios/roles";
import { getCurrentActor } from "@/modules/usuarios/sesion";

const dateTime = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Argentina/Buenos_Aires",
});

const FILTER_LABELS: Record<ClaimFilter, string> = {
  abiertos: "Sin resolver",
  todos: "Todos",
  ...CLAIM_STATUS_LABELS,
};
const FILTERS: ClaimFilter[] = ["abiertos", "todos", ...CLAIM_STATUSES];

const hrefFor = (estado: ClaimFilter, pagina = 1) =>
  `/admin/reclamos?estado=${estado}${pagina > 1 ? `&pagina=${pagina}` : ""}`;

// Primeras palabras de la descripción, para la lista.
const preview = (text: string) => (text.length > 80 ? `${text.slice(0, 80)}…` : text);

// RN-066, RN-090: reclamos para el admin. Por defecto, los sin resolver.
async function Content({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  const actor = await getCurrentActor();
  if (!actor || !hasPermission(actor.roles, "claim.manage")) return <NoAccess />;
  const filter = AdminClaimFilterSchema.parse(await searchParams);
  const result = await listClaims(claimStatusesFor(filter.estado), filter.pagina);

  return (
    <div className="flex flex-col gap-4">
      <nav aria-label="Filtrar por estado" className="flex flex-wrap gap-2 text-sm">
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={hrefFor(f)}
            aria-current={f === filter.estado ? "page" : undefined}
            className={
              f === filter.estado
                ? "rounded-full bg-primary px-3 py-1 text-primary-foreground"
                : "rounded-full border px-3 py-1 hover:bg-muted"
            }
          >
            {FILTER_LABELS[f]}
          </Link>
        ))}
      </nav>
      <p className="text-sm text-muted-foreground">
        {result.total} reclamo{result.total === 1 ? "" : "s"}
      </p>
      <ul className="flex flex-col gap-2">
        {result.claims.map((c) => (
          <li key={c.id}>
            <Link
              href={`/admin/reclamos/${c.id}`}
              className="flex flex-col gap-1 rounded-lg border px-3 py-2 text-sm hover:bg-muted"
            >
              <span className="flex flex-wrap gap-2">
                <span className="font-medium">{CLAIM_STATUS_LABELS[c.status]}</span>
                <span className="text-muted-foreground">{dateTime.format(c.createdAt)}</span>
                <span className="text-muted-foreground">
                  · Pedido {orderNumber(c.orderId)} · {c.customerName}
                </span>
              </span>
              <span>{preview(c.description)}</span>
            </Link>
          </li>
        ))}
      </ul>
      <Pager page={result.page} pages={result.pages} hrefFor={(n) => hrefFor(filter.estado, n)} />
    </div>
  );
}

export default function AdminClaimsPage({ searchParams }: PageProps<"/admin/reclamos">) {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-semibold">Reclamos</h1>
      <Suspense fallback={<p className="text-muted-foreground">Cargando…</p>}>
        <Content searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
