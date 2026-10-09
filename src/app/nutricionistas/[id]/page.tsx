import Image from "next/image";
import { NoAccess } from "@/components/no-access";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { z } from "zod";
import { LoginDialog } from "@/components/login-dialog";
import { getPublicNutritionist } from "@/modules/usuarios/repositorio";
import { hasPermission } from "@/modules/usuarios/roles";
import { getCurrentActor } from "@/modules/usuarios/sesion";

// VU-09: perfil del nutricionista, con sus datos públicos (sin matrícula).
async function Content({ params }: { params: Promise<{ id: string }> }) {
  // Lee la sesión: siempre en el momento del pedido (DT-036).
  await connection();
  const actor = await getCurrentActor();
  if (!actor) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p>Ingresá para ver este perfil.</p>
        <LoginDialog />
      </div>
    );
  }
  if (!hasPermission(actor.roles, "nutritionist.search")) {
    return <NoAccess />;
  }

  const id = z.uuid().safeParse((await params).id);
  const profile = id.success ? await getPublicNutritionist(id.data) : null;
  if (!profile) {
    return <p className="text-muted-foreground">No encontramos a ese nutricionista.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        {profile.photoUrl && (
          <Image src={profile.photoUrl} alt="" width={80} height={80} className="rounded-full" />
        )}
        <h1 className="text-2xl font-semibold">{profile.name}</h1>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
        <dt className="text-muted-foreground">Dirección</dt>
        <dd>{profile.address}</dd>
        <dt className="text-muted-foreground">Teléfono</dt>
        <dd>
          <a href={`tel:${profile.phone.replace(/[^\d+]/g, "")}`} className="underline underline-offset-4">
            {profile.phone}
          </a>
        </dd>
      </dl>
    </div>
  );
}

export default function NutritionistPage({ params }: PageProps<"/nutricionistas/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <Link href="/nutricionistas" className="text-sm underline-offset-4 hover:underline">
        ← Nutricionistas
      </Link>
      <Suspense fallback={<p className="text-muted-foreground">Cargando…</p>}>
        <Content params={params} />
      </Suspense>
    </main>
  );
}
