import Link from "next/link";

// VP-12: página no encontrada.
export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <p className="text-6xl font-semibold text-muted-foreground" aria-hidden>
        404
      </p>
      <h1 className="text-2xl font-semibold">No encontramos esta página</h1>
      <p className="text-muted-foreground">
        Puede que el enlace esté mal escrito o que la página ya no exista.
      </p>
      <Link href="/" className="text-primary underline underline-offset-4">
        Volver al inicio
      </Link>
    </main>
  );
}
