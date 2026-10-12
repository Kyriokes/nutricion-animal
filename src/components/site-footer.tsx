import Link from "next/link";

const COLUMNS = [
  {
    title: "Tienda",
    links: [
      { href: "/catalogo", label: "Catálogo" },
      { href: "/nutricionistas", label: "Nutricionistas" },
      { href: "/carrito", label: "Carrito" },
    ],
  },
  {
    // Páginas de texto (VP-02, VP-10, VP-11) y contacto (VP-03).
    title: "Ayuda",
    links: [
      { href: "/faq", label: "Preguntas frecuentes" },
      { href: "/contacto", label: "Contacto" },
      { href: "/nosotros", label: "Quiénes somos" },
      { href: "/terminos", label: "Términos y condiciones" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t bg-secondary text-secondary-foreground">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-8 sm:grid-cols-[1.5fr_1fr_1fr]">
        <div className="flex flex-col gap-2">
          <p className="font-heading text-lg font-bold">Nutrición animal</p>
          <p className="max-w-xs text-sm">Comida natural para mascotas, con dietas de nutricionistas.</p>
          <p className="text-sm">Envíos en Capital Federal. Pagás con Mercado Pago.</p>
        </div>
        {COLUMNS.map((column) => (
          <nav key={column.title} aria-label={column.title} className="flex flex-col gap-2 text-sm">
            <p className="font-medium">{column.title}</p>
            {column.links.map((l) => (
              <Link key={l.href} href={l.href} className="self-start underline-offset-4 hover:underline">
                {l.label}
              </Link>
            ))}
          </nav>
        ))}
      </div>
    </footer>
  );
}
