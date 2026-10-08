import { z } from "zod";
import type { Result } from "@/lib/result";
import type { User } from "./schema";

// Datos que Google (vía Supabase Auth) entrega al ingresar.
export type AuthUser = {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
};

const ProfileSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  name: z.string().min(1),
  photoUrl: z.url().optional(),
});

export type GoogleProfile = z.infer<typeof ProfileSchema>;

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

// RN-003: arma el perfil con lo que manda Google. Supabase usa full_name y
// avatar_url; algunos proveedores mandan name y picture.
export function profileFromGoogle(
  user: AuthUser,
): Result<{ profile: GoogleProfile }, "invalid_profile"> {
  const meta = user.user_metadata ?? {};
  const email = user.email?.trim().toLowerCase() ?? "";
  const photo = text(meta.avatar_url) ?? text(meta.picture);
  const parsed = ProfileSchema.safeParse({
    id: user.id,
    email,
    name: text(meta.full_name) ?? text(meta.name) ?? email.split("@")[0],
    photoUrl: photo && z.url().safeParse(photo).success ? photo : undefined,
  });
  if (!parsed.success) return { ok: false, error: "invalid_profile" };
  const { photoUrl, ...rest } = parsed.data;
  return { ok: true, profile: photoUrl ? { ...rest, photoUrl } : rest };
}

// RN-024: el primer ingreso crea el usuario como Cliente, con nombre y foto
// de Google. Si ya existe no se toca nada: ni roles (un bloqueado sigue
// bloqueado) ni datos que pudo haber editado.
export function planUserSync(
  existing: User | null,
  profile: GoogleProfile,
): { action: "create"; user: User } | { action: "none" } {
  if (existing) return { action: "none" };
  return { action: "create", user: { ...profile, roles: ["customer"] } };
}

const BASE = "http://interno.invalid";

// Después de ingresar se vuelve solo a rutas del propio sitio: un enlace
// malicioso no puede usar el ingreso para mandar a otro dominio.
export function safeRedirectPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/")) return "/";
  let url: URL;
  try {
    url = new URL(next, BASE);
  } catch {
    return "/";
  }
  if (url.origin !== BASE) return "/";
  // Al normalizar puntos, "/.//evil.com" queda "//evil.com": un navegador lo
  // lee como otro dominio. Se rechaza aunque el origen haya coincidido.
  const path = url.pathname + url.search + url.hash;
  if (path.startsWith("//") || path.startsWith("/\\")) return "/";
  return path;
}
