import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { profileFromGoogle, safeRedirectPath } from "@/modules/usuarios/ingreso";
import { syncUserOnSignIn } from "@/modules/usuarios/sesion";

// Vuelta del ingreso con Google (RN-003): cambia el código por la sesión,
// crea el usuario si es el primer ingreso (RN-024) y vuelve a donde estaba.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeRedirectPath(searchParams.get("next"));

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      const result = profileFromGoogle(data.user);
      if (result.ok) {
        try {
          await syncUserOnSignIn(result.profile);
          return NextResponse.redirect(`${origin}${next}`);
        } catch {
          // Base caída o email ya usado por otra cuenta: no dejamos una
          // sesión sin usuario.
        }
      }
      // Sin un perfil válido no dejamos una sesión a medias.
      await supabase.auth.signOut();
    }
  }
  return NextResponse.redirect(`${origin}/?ingreso=error`);
}
