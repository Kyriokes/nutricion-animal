import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { z } from "zod";
import { NoAccess } from "@/components/no-access";
import { Pager } from "@/components/pager";
import { listContactMessages } from "@/modules/contacto/repositorio";
import { hasPermission } from "@/modules/usuarios/roles";
import { getCurrentActor } from "@/modules/usuarios/sesion";

const dateTime = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Argentina/Buenos_Aires",
});

// Como las otras bandejas del admin (RN-090): abre en lo que falta atender.
const FilterSchema = z.object({
  ver: z.enum(["nuevos", "todos"]).catch("nuevos"),
  pagina: z.coerce.number().int().min(1).max(10_000).catch(1),
});
type View = z.infer<typeof FilterSchema>["ver"];
const VIEWS: { value: View; label: string }[] = [
  { value: "nuevos", label: "Nuevos" },
  { value: "todos", label: "Todos" },
];
const hrefFor = (ver: View, pagina = 1) => `/admin/mensajes?ver=${ver}${pagina > 1 ? `&pagina=${pagina}` : ""}`;

// RN-080: mensajes del formulario de contacto.
async function Content({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  const actor = await getCurrentActor();
  if (!actor || !hasPermission(actor.roles, "contact.manage")) return <NoAccess />;
  const filter = FilterSchema.parse(await searchParams);
  const result = await listContactMessages(filter.ver === "nuevos", filter.pagina);

  return (
    <div className="flex flex-col gap-4">
      {/* RN-083: lugar reservado para la bandeja unificada, sin lógica todavía. */}
      <p className="rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">
        Más adelante: una sola bandeja para el formulario, el email y WhatsApp.
      </p>
      <nav aria-label="Filtrar mensajes" className="flex flex-wrap gap-2 text-sm">
        {VIEWS.map((v) => (
          <Link
            key={v.value}
            href={hrefFor(v.value)}
            aria-current={v.value === filter.ver ? "page" : undefined}
            className={
              v.value === filter.ver
                ? "rounded-full bg-primary px-3 py-1 text-primary-foreground"
                : "rounded-full border px-3 py-1 hover:bg-muted"
            }
          >
            {v.label}
          </Link>
        ))}
      </nav>
      <p className="text-sm text-muted-foreground">
        {result.total} mensaje{result.total === 1 ? "" : "s"}
      </p>
      <ul className="flex flex-col gap-2">
        {result.messages.map((m) => (
          <li key={m.id}>
            {/* Sin prefetch: abrir el mensaje lo marca leído, y adelantarlo no es abrirlo. */}
            <Link
              href={`/admin/mensajes/${m.id}`}
              prefetch={false}
              className="flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted"
            >
              {!m.readAt && (
                <span className="rounded-full bg-primary px-2 text-xs text-primary-foreground">Nuevo</span>
              )}
              <span className={m.readAt ? "" : "font-medium"}>{m.subject}</span>
              <span className="text-muted-foreground">
                · {m.name} · {dateTime.format(m.createdAt)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <Pager page={result.page} pages={result.pages} hrefFor={(n) => hrefFor(filter.ver, n)} />
    </div>
  );
}

export default function AdminMessagesPage({ searchParams }: PageProps<"/admin/mensajes">) {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-semibold">Mensajes de contacto</h1>
      <Suspense fallback={<p className="text-muted-foreground">Cargando…</p>}>
        <Content searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
