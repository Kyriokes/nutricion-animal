import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { z } from "zod";
import { DietContentView } from "@/components/diet-content-view";
import { isVersionFrozen, patientOf } from "@/modules/dietas/asignaciones";
import { authorize, latestVersion } from "@/modules/dietas/base";
import { getDietDetail } from "@/modules/dietas/repositorio";
import { planEdit } from "@/modules/dietas/versiones";
import { getCurrentActor } from "@/modules/usuarios/sesion";
import { DietEditor, type EditPlan } from "../diet-editor";
import {
  AssignPet,
  CloneButton,
  DeleteDietButton,
  DeleteVersionButton,
  ReassignButton,
  RenameForm,
  UnassignButton,
} from "./diet-controls";

const dateFormat = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" });

// VN-03 y VN-04: una dieta con sus versiones y asignaciones.
async function Content({ params }: { params: Promise<{ id: string }> }) {
  // Lee la sesión: siempre en el momento del pedido (DT-036).
  await connection();
  const actor = await getCurrentActor();
  const id = z.uuid().safeParse((await params).id);
  const detail = id.success ? await getDietDetail(id.data) : null;
  if (!actor || !detail || authorize(actor, detail.diet, "diet.manage")) {
    return <p className="text-muted-foreground">No encontramos esa dieta.</p>;
  }

  const { diet, versions, assignments, pets } = detail;
  const latest = latestVersion(versions)!;
  const edit = planEdit(detail);
  const petLabel = (petId: string) => {
    const p = pets.get(petId);
    return p ? `${p.name} (${p.species}) · ${p.ownerName}` : "Mascota";
  };
  const plan: EditPlan =
    edit.mode === "in_place"
      ? edit
      : {
          mode: "new_version",
          activePets: edit.activePetIds.map((petId) => ({ id: petId, label: petLabel(petId) })),
        };
  const numberOf = new Map(versions.map((v) => [v.id, v.number]));
  const active = assignments.filter((a) => !a.endedAt);
  // RN-023: la mascota para la que se hizo la dieta.
  const patientId = patientOf(diet, versions, assignments);
  const ended = assignments.filter((a) => a.endedAt);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <RenameForm dietId={diet.id} name={diet.name} />
        <div className="flex items-center gap-2">
          <CloneButton dietId={diet.id} />
          {assignments.length === 0 && <DeleteDietButton dietId={diet.id} />}
        </div>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Versión {latest.number} (la última)</h2>
        <DietContentView content={latest.content} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Editar</h2>
        <DietEditor
          key={`${latest.id}-${plan.mode}`}
          mode="edit"
          dietId={diet.id}
          latestVersionId={latest.id}
          initial={latest.content}
          plan={plan}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Paciente</h2>
        {patientId ? (
          <>
            {active.length === 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
                <span>{petLabel(patientId)} · hoy no la tiene activa</span>
                <ReassignButton dietId={diet.id} petId={patientId} petName={pets.get(patientId)?.name ?? "su paciente"} />
              </div>
            ) : (
              <ul className="flex flex-col gap-1 text-sm">
                {active.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2">
                    <span>
                      {petLabel(a.petId)} · versión {numberOf.get(a.dietVersionId)} · desde el{" "}
                      {dateFormat.format(a.assignedAt)}
                    </span>
                    <UnassignButton dietId={diet.id} assignmentId={a.id} />
                  </li>
                ))}
              </ul>
            )}
            <p className="text-sm text-muted-foreground">
              Una dieta es para un solo paciente. Para usarla con otra mascota, clonala y asigná la copia.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">Todavía no tiene paciente.</p>
            <h3 className="font-medium">Asignar a una mascota</h3>
            {/* VN-04 [A DEFINIR]: alcance de la búsqueda pendiente de definición. */}
            <p role="note" className="rounded bg-warning px-2 py-1 text-sm text-warning-foreground">
              Funcionamiento provisorio: todavía no está definido qué clientes puede
              buscar cada nutricionista. Usalo solo con clientes que te consultaron.
            </p>
            <AssignPet dietId={diet.id} />
          </>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">Versiones</h2>
        <ul className="flex flex-col gap-1 text-sm">
          {[...versions].reverse().map((v) => (
            <li key={v.id} className="flex flex-wrap items-center gap-2">
              Versión {v.number} · {dateFormat.format(v.createdAt)}
              {isVersionFrozen(v.id, assignments) ? (
                <span className="text-muted-foreground">· asignada alguna vez (fija)</span>
              ) : (
                versions.length > 1 && <DeleteVersionButton dietId={diet.id} versionId={v.id} />
              )}
            </li>
          ))}
        </ul>
      </section>

      {ended.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-medium">Historial de asignaciones</h2>
          <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
            {ended.map((a) => (
              <li key={a.id}>
                {petLabel(a.petId)} · versión {numberOf.get(a.dietVersionId)} ·{" "}
                {dateFormat.format(a.assignedAt)} → {dateFormat.format(a.endedAt!)}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export default function DietPage({ params }: PageProps<"/dietas/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-8">
      <Link href="/dietas" className="text-sm underline-offset-4 hover:underline">
        ← Mis dietas
      </Link>
      <Suspense fallback={<p className="text-muted-foreground">Cargando…</p>}>
        <Content params={params} />
      </Suspense>
    </main>
  );
}
