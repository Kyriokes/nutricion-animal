import Link from "next/link";

// VP-13: acceso sin permisos. Se muestra en lugar del contenido cuando quien
// entra no tiene el permiso necesario (la verificación se hace en el servidor).
export function NoAccess() {
  return (
    <div className="flex flex-col items-start gap-3 py-8">
      <h2 className="text-xl font-semibold">No tenés acceso a esta sección</h2>
      <p className="text-muted-foreground">
        Tu cuenta no tiene los permisos necesarios para ver esta página.
      </p>
      <Link href="/" className="text-primary underline underline-offset-4">
        Volver al inicio
      </Link>
    </div>
  );
}
