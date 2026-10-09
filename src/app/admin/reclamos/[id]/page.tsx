import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { z } from "zod";
import { ClaimList } from "@/components/claim-list";
import { NoAccess } from "@/components/no-access";
import { STATUS_LABELS } from "@/modules/pedidos/estados";
import { orderNumber } from "@/modules/pedidos/presentacion";
import { getClaimForAdmin } from "@/modules/pedidos/repositorio";
import { hasPermission } from "@/modules/usuarios/roles";
import { getCurrentActor } from "@/modules/usuarios/sesion";
import { ClaimActions } from "../claim-actions";

// RN-066: detalle de un reclamo para el admin, con las acciones para
// revisarlo y resolverlo.
async function Content({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const actor = await getCurrentActor();
  if (!actor || !hasPermission(actor.roles, "claim.manage")) return <NoAccess />;
  const id = z.uuid().safeParse((await params).id);
  const claim = id.success ? await getClaimForAdmin(id.data) : null;
  if (!claim) return <p className="text-muted-foreground">No encontramos ese reclamo.</p>;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Reclamo</h1>
        <p className="text-sm">
          <Link href={`/admin/pedidos/${claim.orderId}`} className="underline underline-offset-4">
            Pedido {orderNumber(claim.orderId)}
          </Link>{" "}
          · {STATUS_LABELS[claim.orderStatus]}
        </p>
        <p className="text-sm text-muted-foreground">
          {claim.customer.name} · {claim.customer.email}
        </p>
      </div>
      <ClaimList claims={[claim]} />
      <ClaimActions claimId={claim.id} status={claim.status} />
    </div>
  );
}

export default function AdminClaimPage({ params }: PageProps<"/admin/reclamos/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <Link href="/admin/reclamos" className="text-sm underline-offset-4 hover:underline">
        ← Reclamos
      </Link>
      <Suspense fallback={<p className="text-muted-foreground">Cargando…</p>}>
        <Content params={params} />
      </Suspense>
    </main>
  );
}
