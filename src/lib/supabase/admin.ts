import { createClient } from "@supabase/supabase-js";

// Cliente con la clave secreta (DT-028): SOLO servidor. Saltea RLS, así que
// se usa únicamente después de verificar permisos en el código (por ejemplo,
// subir la foto del propio usuario). Nunca importarlo desde un componente
// "use client": SUPABASE_SECRET_KEY no tiene prefijo NEXT_PUBLIC_ y quedaría
// vacía en el navegador.
export function createSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
