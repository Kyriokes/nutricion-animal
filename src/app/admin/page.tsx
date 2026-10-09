import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { NoAccess } from "@/components/no-access";
import { countOutOfStockProducts } from "@/modules/catalogo/repositorio";
import { countNewMessages } from "@/modules/contacto/repositorio";
import { formatPrice } from "@/modules/catalogo/presentacion";
import {
  countOpenClaims,
  countPendingOrders,
  salesSummary,
  topSoldProducts,
} from "@/modules/pedidos/estadisticas";
import { periodRange, SalesFilterSchema } from "@/modules/pedidos/ventas";
import { countPendingApplications } from "@/modules/usuarios/repositorio";
import { hasPermission, type Permission } from "@/modules/usuarios/roles";
import { getCurrentActor } from "@/modules/usuarios/sesion";

type Card = { href: string; label: string; permission: Permission; count: () => Promise<number> };

// RN-090: cada tarjeta lleva a su lista, que abre con su filtro por defecto.
const CARDS: Card[] = [
  { href: "/admin/pedidos", label: "Pedidos pendientes", permission: "order.view_all", count: countPendingOrders },
  { href: "/admin/reclamos", label: "Reclamos sin resolver", permission: "claim.manage", count: countOpenClaims },
  {
    href: "/admin/postulaciones",
    label: "Postulaciones pendientes",
    permission: "application.decide",
    count: countPendingApplications,
  },
  { href: "/admin/catalogo", label: "Productos sin stock", permission: "catalog.manage", count: countOutOfStockProducts },
  { href: "/admin/mensajes", label: "Mensajes nuevos", permission: "contact.manage", count: countNewMessages },
];

// VA-01: dashboard del admin (RN-090, RN-091). Se entra con el mismo permiso
// que lo muestra en el menú; cada tarjeta, además, solo si se tiene el permiso
// de esa lista.
async function Content() {
  await connection();
  const actor = await getCurrentActor();
  if (!actor || !hasPermission(actor.roles, "order.view_all")) return <NoAccess />;
  const can = (p: Permission) => hasPermission(actor.roles, p);
  const cards = CARDS.filter((c) => can(c.permission));
  const today = periodRange(SalesFilterSchema(new Date()).parse({}));
  const [counts, todaySales, topSold] = await Promise.all([
    Promise.all(cards.map((c) => c.count())),
    salesSummary(today),
    topSoldProducts(10),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <li>
          <Link href="/admin/ventas" className="flex h-full flex-col gap-1 rounded-lg border p-3 hover:bg-muted">
            <span className="text-sm text-muted-foreground">Ventas de hoy</span>
            <span className="text-2xl font-semibold">{formatPrice(todaySales.total)}</span>
            <span className="text-xs text-muted-foreground">
              {todaySales.count} pedido{todaySales.count === 1 ? "" : "s"}
            </span>
          </Link>
        </li>
        {cards.map((c, i) => (
          <li key={c.href}>
            <Link href={c.href} className="flex h-full flex-col gap-1 rounded-lg border p-3 hover:bg-muted">
              <span className="text-sm text-muted-foreground">{c.label}</span>
              <span className="text-2xl font-semibold">{counts[i]}</span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="grid gap-8 md:grid-cols-2">
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-medium">Lo más vendido</h2>
          {topSold.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no hay ventas.</p>
          ) : (
            <ol className="flex flex-col gap-1 text-sm">
              {topSold.map((p, i) => (
                <li key={p.productId} className="flex justify-between gap-2 border-b py-1">
                  <span>
                    {i + 1}.{" "}
                    <Link href={`/admin/catalogo/${p.productId}`} className="underline-offset-4 hover:underline">
                      {p.name}
                    </Link>
                  </span>
                  <span className="text-muted-foreground">
                    {p.units} unidad{p.units === 1 ? "" : "es"}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
        {/* RN-091: espera la definición de qué se guarda de cada búsqueda (pregunta 17). */}
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-medium">Búsquedas más frecuentes</h2>
          <p className="rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">
            Disponible cuando se definan qué datos se guardan de cada búsqueda.
          </p>
        </section>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <Suspense fallback={<p className="text-muted-foreground">Cargando…</p>}>
        <Content />
      </Suspense>
    </main>
  );
}
