import type { Result } from "@/lib/result";

// RN-016: foto de perfil. JPG, PNG o WebP de hasta 1 MB.
export const MAX_PHOTO_BYTES = 1024 * 1024;
export const AVATARS_BUCKET = "avatars";

const FORMATS = {
  "image/jpeg": { ext: "jpg", matches: (b: Uint8Array) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  "image/png": {
    ext: "png",
    matches: (b: Uint8Array) =>
      [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((v, i) => b[i] === v),
  },
  "image/webp": {
    ext: "webp",
    // "RIFF" .... "WEBP"
    matches: (b: Uint8Array) =>
      [0x52, 0x49, 0x46, 0x46].every((v, i) => b[i] === v) &&
      [0x57, 0x45, 0x42, 0x50].every((v, i) => b[i + 8] === v),
  },
} as const;

type PhotoError = "empty" | "too_large" | "unsupported_type" | "content_mismatch";

// Valida tipo, tamaño y los primeros bytes del archivo: un archivo con otro
// contenido (por ejemplo un SVG o un HTML renombrado) no pasa aunque diga
// ser una imagen.
export function validatePhoto(file: {
  type: string;
  size: number;
  head: Uint8Array;
}): Result<{ ext: string }, PhotoError> {
  if (file.size === 0) return { ok: false, error: "empty" };
  if (file.size > MAX_PHOTO_BYTES) return { ok: false, error: "too_large" };
  const format = FORMATS[file.type as keyof typeof FORMATS];
  if (!format) return { ok: false, error: "unsupported_type" };
  if (!format.matches(file.head)) return { ok: false, error: "content_mismatch" };
  return { ok: true, ext: format.ext };
}

// Si la URL es de una foto de nuestro bucket, devuelve su ruta dentro del
// bucket (para borrar la anterior al cambiarla). La foto de Google no se toca.
// Además exige que esté en la carpeta del propio usuario, sin "..", para que
// nunca se borre la foto de otro aunque la URL guardada estuviera mal.
export function avatarPathFromUrl(
  url: string | null | undefined,
  supabaseUrl: string,
  userId: string,
): string | null {
  const prefix = `${supabaseUrl}/storage/v1/object/public/${AVATARS_BUCKET}/`;
  if (!url?.startsWith(prefix)) return null;
  const path = url.slice(prefix.length);
  const parts = path.split("/");
  const ownFile = parts.length === 2 && parts[0] === userId && parts[1] && !parts[1].startsWith(".");
  return ownFile ? path : null;
}
