import Link from "next/link";

const LINKS = [
  { href: "/faq", label: "Preguntas frecuentes" },
  { href: "/nosotros", label: "Quiénes somos" },
  { href: "/terminos", label: "Términos y condiciones" },
  { href: "/contacto", label: "Contacto" },
];

// Pie de página con las páginas de texto (VP-02, VP-10, VP-11) y contacto (VP-03).
export function SiteFooter() {
  return (
    <footer className="mt-auto border-t px-4 py-6">
      <nav aria-label="Información" className="mx-auto flex max-w-6xl flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="underline-offset-4 hover:underline">
            {l.label}
          </Link>
        ))}
      </nav>
    </footer>
  );
}
