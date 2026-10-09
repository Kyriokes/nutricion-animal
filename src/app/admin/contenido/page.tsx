import { connection } from "next/server";
import { Suspense } from "react";
import { NoAccess } from "@/components/no-access";
import { PAGE_DEFAULT_TITLES, PAGE_SLUGS } from "@/modules/contenido/paginas";
import { getPageForEditing } from "@/modules/contenido/repositorio";
import { hasPermission } from "@/modules/usuarios/roles";
import { getCurrentActor } from "@/modules/usuarios/sesion";
import { PageEditor } from "./page-editor";

const PATHS = { faq: "/faq", nosotros: "/nosotros", terminos: "/terminos" } as const;

// VA-09: edición de FAQ, quiénes somos y términos.
async function Content() {
  await connection();
  const actor = await getCurrentActor();
  if (!actor || !hasPermission(actor.roles, "content.manage")) return <NoAccess />;
  const pages = await Promise.all(PAGE_SLUGS.map((slug) => getPageForEditing(slug)));
  return (
    <div className="flex flex-col gap-10">
      <p className="text-sm text-muted-foreground">
        Formato: una línea que empieza con <code>## </code> es un subtítulo; una
        línea en blanco separa párrafos.
      </p>
      {PAGE_SLUGS.map((slug, i) => (
        <section key={slug} className="flex flex-col gap-3">
          <h2 className="text-lg font-medium">{PAGE_DEFAULT_TITLES[slug]}</h2>
          <PageEditor slug={slug} path={PATHS[slug]} initial={pages[i]} />
        </section>
      ))}
    </div>
  );
}

export default function ContentAdminPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-semibold">Contenido del sitio</h1>
      <Suspense fallback={<p className="text-muted-foreground">Cargando…</p>}>
        <Content />
      </Suspense>
    </main>
  );
}
