import { createBrowserClient } from "@supabase/ssr";

// Cliente de Supabase para componentes del navegador (por ejemplo, iniciar el
// ingreso con Google). Usa la clave publishable, que es pública.
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
