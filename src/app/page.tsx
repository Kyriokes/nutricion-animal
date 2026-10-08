import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

// Página provisoria hasta la landing (VP-01): muestra la paleta aplicada
// para poder verificar los modos claro y oscuro (RN-070, RN-073).
const STATUS = [
  { label: "Error", className: "bg-destructive text-destructive-foreground" },
  { label: "Éxito", className: "bg-success text-success-foreground" },
  { label: "Advertencia", className: "bg-warning text-warning-foreground" },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex justify-end p-4">
        <ThemeToggle />
      </header>
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-12">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold">Nutrición animal</h1>
          <p className="text-muted-foreground">
            Comida natural para mascotas, con dietas de nutricionistas.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button>Primario</Button>
          <Button variant="secondary">Secundario</Button>
          <Button variant="outline">Contorno</Button>
        </div>
        <div className="rounded-lg border bg-card p-4 text-card-foreground">
          <p className="mb-3 bg-accent p-2 text-accent-foreground">Acento</p>
          <div className="flex flex-wrap gap-2">
            {STATUS.map((s) => (
              <span key={s.label} className={`rounded-md px-2 py-1 text-sm ${s.className}`}>
                {s.label}
              </span>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
