import Image from "next/image";
import { connection } from "next/server";
import { Suspense } from "react";
import { LoginDialog } from "@/components/login-dialog";
import {
  APPLICATION_KINDS,
  applicationOptions,
  unseenDecisions,
  type Application,
  type ApplicationKind,
} from "@/modules/usuarios/postulaciones";
import { MAX_ADDRESSES } from "@/modules/usuarios/direcciones";
import {
  getProfessionalProfile,
  listAddresses,
  listOwnApplications,
} from "@/modules/usuarios/repositorio";
import { ROLE_LABELS } from "@/modules/usuarios/roles";
import { getCurrentUser } from "@/modules/usuarios/sesion";
import {
  AddressesSection,
  ApplicationForm,
  MarkSeenButton,
  NameForm,
  PhotoForm,
  ProfessionalProfileForm,
} from "./profile-forms";

const KIND_LABELS: Record<ApplicationKind, string> = {
  nutritionist: "Nutricionista",
  supplier: "Proveedor",
};

const STATUS_LABELS: Record<Application["status"], string> = {
  pending: "En revisión",
  approved: "Aprobada",
  rejected: "Rechazada",
};

const dateFormat = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" });

// VU-01: perfil y datos personales.
async function Profile() {
  // Lee la sesión: siempre en el momento del pedido (DT-036).
  await connection();
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p>Ingresá para ver tu perfil.</p>
        <LoginDialog />
      </div>
    );
  }

  const applications = await listOwnApplications(user.id);
  const options = applicationOptions(user.roles, applications);
  const unseen = unseenDecisions(applications);

  return (
    <div className="flex flex-col gap-8">
      {unseen.length > 0 && (
        <section
          role="status"
          className="flex flex-col gap-2 rounded-lg border bg-accent p-4 text-accent-foreground"
        >
          <h2 className="font-medium">Novedades de tus postulaciones</h2>
          <ul className="flex flex-col gap-1 text-sm">
            {unseen.map((a) => (
              <li key={a.id}>
                {a.status === "approved"
                  ? `Tu postulación como ${KIND_LABELS[a.data.kind].toLowerCase()} fue aprobada.`
                  : `Tu postulación como ${KIND_LABELS[a.data.kind].toLowerCase()} fue rechazada.`}
                {a.decisionNote && ` Motivo: ${a.decisionNote}`}
              </li>
            ))}
          </ul>
          <MarkSeenButton />
        </section>
      )}
      <section className="flex items-center gap-4">
        {user.photoUrl && (
          <Image src={user.photoUrl} alt="" width={64} height={64} className="rounded-full" />
        )}
        <div className="flex flex-col gap-1">
          <p className="text-lg font-medium">{user.name}</p>
          <p className="text-sm text-muted-foreground">{user.email}</p>
          <p className="text-sm">
            {user.roles.length > 0
              ? user.roles.map((r) => ROLE_LABELS[r]).join(" · ")
              : "Cuenta sin roles"}
          </p>
        </div>
      </section>

      <section className="flex max-w-md flex-col gap-4">
        <NameForm name={user.name} />
        <PhotoForm />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Mis direcciones</h2>
        <AddressesSection addresses={await listAddresses(user.id)} max={MAX_ADDRESSES} />
      </section>

      {user.roles.includes("nutritionist") && (
        <section className="flex max-w-md flex-col gap-3">
          <h2 className="text-lg font-medium">Perfil profesional</h2>
          <p className="text-sm text-muted-foreground">
            Los clientes ven tu nombre, tu foto, tu dirección y tu teléfono.
          </p>
          <ProfessionalProfileForm profile={await getProfessionalProfile(user.id)} />
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Postulaciones</h2>
        {APPLICATION_KINDS.map((kind) => {
          const option = options[kind];
          if (option === "available") return <ApplicationForm key={kind} kind={kind} />;
          const text = {
            pending: `Tu postulación como ${KIND_LABELS[kind].toLowerCase()} está en revisión.`,
            has_role: `Ya sos ${KIND_LABELS[kind].toLowerCase()}.`,
            // RN-046: el aviso general ya indica contactar a soporte.
            blocked: "Tu cuenta está suspendida: no podés postularte.",
          }[option];
          return (
            <p key={kind} className="text-sm text-muted-foreground">
              {text}
            </p>
          );
        })}

        {applications.length > 0 && (
          <ul className="flex flex-col gap-1 text-sm">
            {applications.map((a) => (
              <li key={a.id}>
                {KIND_LABELS[a.data.kind]} — {STATUS_LABELS[a.status]} (
                {dateFormat.format(a.decidedAt ?? a.submittedAt)})
                {a.decisionNote && ` — Motivo: ${a.decisionNote}`}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-semibold">Mi perfil</h1>
      <Suspense fallback={<p className="text-muted-foreground">Cargando…</p>}>
        <Profile />
      </Suspense>
    </main>
  );
}
