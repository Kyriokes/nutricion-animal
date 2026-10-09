import { NoAccess } from "@/components/no-access";
import { connection } from "next/server";
import { Suspense } from "react";
import type { Application } from "@/modules/usuarios/postulaciones";
import {
  listPendingApplications,
  listRecentlyDecidedApplications,
} from "@/modules/usuarios/repositorio";
import { hasPermission } from "@/modules/usuarios/roles";
import { getCurrentActor } from "@/modules/usuarios/sesion";
import { DecisionButtons } from "./decision-buttons";

const KIND_LABELS = { nutritionist: "Nutricionista", supplier: "Proveedor" };
const STATUS_LABELS = { pending: "En revisión", approved: "Aprobada", rejected: "Rechazada" };
const dateFormat = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "medium",
  timeStyle: "short",
});

// Datos del formulario, con nombres en español.
function ApplicationData({ data }: { data: Application["data"] }) {
  const rows =
    data.kind === "nutritionist"
      ? [
          ["Dirección", data.address],
          ["Teléfono", data.phone],
          ["Matrícula", data.licenseNumber],
        ]
      : [["Negocio", data.businessName]];
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-muted-foreground">{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

// VA-06: postulaciones a nutricionista o proveedor (RN-024, RN-043).
async function Content() {
  // Lee la sesión: siempre en el momento del pedido (DT-036).
  await connection();
  const actor = await getCurrentActor();
  if (!actor || !hasPermission(actor.roles, "application.decide")) {
    // VP-13: acceso sin permisos.
    return <NoAccess />;
  }

  const [pending, decided] = await Promise.all([
    listPendingApplications(),
    listRecentlyDecidedApplications(),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Pendientes ({pending.length})</h2>
        {pending.length === 0 && (
          <p className="text-sm text-muted-foreground">No hay postulaciones pendientes.</p>
        )}
        {pending.map(({ application, user }) => (
          <article key={application.id} className="flex flex-col gap-3 rounded-lg border p-4">
            <div>
              <p className="font-medium">
                {user.name} · {KIND_LABELS[application.data.kind]}
                {user.suspended && (
                  <span className="ml-2 rounded bg-warning px-1.5 py-0.5 text-xs text-warning-foreground">
                    Cuenta suspendida
                  </span>
                )}
              </p>
              <p className="text-sm text-muted-foreground">
                {user.email} · enviada el {dateFormat.format(application.submittedAt)}
              </p>
            </div>
            <ApplicationData data={application.data} />
            {application.userId === actor.id && !actor.roles.includes("admin") ? (
              <p className="text-sm text-muted-foreground">
                Es tu propia postulación: la decide un administrador.
              </p>
            ) : (
              <DecisionButtons applicationId={application.id} />
            )}
          </article>
        ))}
      </section>

      {decided.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-medium">Decididas recientemente</h2>
          <ul className="flex flex-col gap-1 text-sm">
            {decided.map(({ application, user }) => (
              <li key={application.id}>
                {user.name} · {KIND_LABELS[application.data.kind]} ·{" "}
                {STATUS_LABELS[application.status]}
                {application.decidedAt && ` · ${dateFormat.format(application.decidedAt)}`}
                {application.decisionNote && ` · Motivo: ${application.decisionNote}`}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export default function ApplicationsPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-semibold">Postulaciones</h1>
      <Suspense fallback={<p className="text-muted-foreground">Cargando…</p>}>
        <Content />
      </Suspense>
    </main>
  );
}
