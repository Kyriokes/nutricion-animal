import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { z } from "zod";
import { NoAccess } from "@/components/no-access";
import { Button } from "@/components/ui/button";
import { openContactMessage } from "@/modules/contacto/repositorio";
import { hasPermission } from "@/modules/usuarios/roles";
import { getCurrentActor } from "@/modules/usuarios/sesion";

const dateTime = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Argentina/Buenos_Aires",
});

// RN-080: un mensaje de contacto. Al abrirlo queda leído.
async function Content({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const actor = await getCurrentActor();
  if (!actor || !hasPermission(actor.roles, "contact.manage")) return <NoAccess />;
  const id = z.uuid().safeParse((await params).id);
  const msg = id.success ? await openContactMessage(id.data) : null;
  if (!msg) return <p className="text-muted-foreground">No encontramos ese mensaje.</p>;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{msg.subject}</h1>
      <p className="text-sm text-muted-foreground">
        {msg.name} ·{" "}
        <a href={`mailto:${msg.email}`} className="underline underline-offset-4">
          {msg.email}
        </a>{" "}
        · {dateTime.format(msg.createdAt)}
        {msg.userId && " · con cuenta en el sitio"}
      </p>
      <p className="whitespace-pre-line rounded-lg border px-3 py-2 text-sm">{msg.message}</p>
      {/* RN-080: cómo se responde desde acá está [A DEFINIR]; por ahora, lugar reservado. */}
      <div className="flex flex-col gap-1">
        <Button disabled className="w-fit">
          Responder
        </Button>
        <p className="text-xs text-muted-foreground">
          Responder desde acá todavía no está disponible: por ahora, respondé por email.
        </p>
      </div>
    </div>
  );
}

export default function AdminMessagePage({ params }: PageProps<"/admin/mensajes/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <Link href="/admin/mensajes" className="text-sm underline-offset-4 hover:underline">
        ← Mensajes
      </Link>
      <Suspense fallback={<p className="text-muted-foreground">Cargando…</p>}>
        <Content params={params} />
      </Suspense>
    </main>
  );
}
