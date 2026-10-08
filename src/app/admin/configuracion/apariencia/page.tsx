import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { readPalettesForEditing } from "@/modules/apariencia/repositorio";
import { hasPermission } from "@/modules/usuarios/roles";
import { getCurrentActor } from "@/modules/usuarios/sesion";
import { PaletteForm } from "./palette-form";

// VA-08: apariencia del sitio (RN-070 a RN-072). Solo el admin.
async function Content() {
  // Lee la sesión: siempre en el momento del pedido (DT-036).
  await connection();
  const actor = await getCurrentActor();
  if (!actor || !hasPermission(actor.roles, "settings.manage")) {
    // VP-13: acceso sin permisos.
    return (
      <div className="flex flex-col gap-2">
        <p>No tenés permisos para ver esta página.</p>
        <Link href="/" className="text-primary underline underline-offset-4">
          Volver al inicio
        </Link>
      </div>
    );
  }
  const { palettes, source } = await readPalettesForEditing();
  if (source === "fallback") {
    return (
      <p role="alert" className="text-destructive">
        No se pudo leer la paleta guardada. Para no pisarla, la edición queda
        deshabilitada. Recargá la página en un momento.
      </p>
    );
  }
  return <PaletteForm initial={palettes} />;
}

export default function AppearancePage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Apariencia</h1>
        <p className="text-muted-foreground">
          Colores del sitio para el modo claro y el oscuro.
        </p>
      </div>
      <Suspense fallback={<p className="text-muted-foreground">Cargando…</p>}>
        <Content />
      </Suspense>
    </main>
  );
}
