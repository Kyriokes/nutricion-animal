import Link from "next/link";
import { CLAIM_STATUS_LABELS, RESOLUTION_LABELS, type ClaimStatus, type Resolution } from "@/modules/pedidos/reclamos";

const dateTime = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Argentina/Buenos_Aires",
});

type ClaimView = {
  id: string;
  status: ClaimStatus;
  description: string;
  resolution: Resolution | null;
  resolutionNote: string | null;
  createdAt: Date;
};

// RN-066: reclamos de un pedido, con su estado y, si se resolvió, cómo.
// Con `hrefFor`, cada reclamo lleva a su detalle (vista del admin).
export function ClaimList({ claims, hrefFor }: { claims: readonly ClaimView[]; hrefFor?: (id: string) => string }) {
  if (claims.length === 0) return null;
  return (
    <ul className="flex flex-col gap-2">
      {claims.map((c) => (
        <li key={c.id} className="flex flex-col gap-1 rounded-lg border px-3 py-2 text-sm">
          <div className="flex flex-wrap gap-2">
            {hrefFor ? (
              <Link href={hrefFor(c.id)} className="font-medium underline-offset-4 hover:underline">
                {CLAIM_STATUS_LABELS[c.status]}
              </Link>
            ) : (
              <span className="font-medium">{CLAIM_STATUS_LABELS[c.status]}</span>
            )}
            <span className="text-muted-foreground">{dateTime.format(c.createdAt)}</span>
          </div>
          <p className="whitespace-pre-line">{c.description}</p>
          {c.resolution && (
            <p className="text-muted-foreground">
              Resolución: {RESOLUTION_LABELS[c.resolution]}
              {c.resolutionNote && <> · {c.resolutionNote}</>}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
