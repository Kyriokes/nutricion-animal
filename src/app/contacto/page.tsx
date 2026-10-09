import { connection } from "next/server";
import { Suspense } from "react";
import { ContactForm } from "@/components/contact-form";
import { CONTACT_CHANNELS, whatsappLink } from "@/modules/contacto/mensajes";
import { getCurrentUser } from "@/modules/usuarios/sesion";

// Con sesión, el formulario viene con nombre y email.
async function Form() {
  await connection();
  const user = await getCurrentUser();
  return <ContactForm defaults={user ? { name: user.name, email: user.email } : undefined} />;
}

// VP-03: contacto. Formulario (RN-080) y, al lado, email y WhatsApp (RN-081).
export default function ContactPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-semibold">Contacto</h1>
      <p className="text-muted-foreground">Escribinos por este formulario o, si preferís, por email o WhatsApp.</p>
      <ul className="flex flex-wrap gap-4 text-sm">
        <li>
          Email:{" "}
          <a href={`mailto:${CONTACT_CHANNELS.email}`} className="underline underline-offset-4">
            {CONTACT_CHANNELS.email}
          </a>
        </li>
        <li>
          <a
            href={whatsappLink(CONTACT_CHANNELS.whatsapp, "Hola, tengo una consulta")}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4"
          >
            Escribinos por WhatsApp
          </a>
        </li>
      </ul>
      <Suspense fallback={<ContactForm />}>
        <Form />
      </Suspense>
    </main>
  );
}
