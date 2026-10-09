import { describe, expect, it } from "vitest";
import { MAX_PHOTO_BYTES, avatarPathFromUrl, ownedStoragePath, validatePhoto } from "./foto";

const JPEG = [0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0];
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0];
// "RIFF" + tamaño + "WEBP"
const WEBP = [0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50];

const bytes = (head: number[]) => new Uint8Array(head);

describe("usuarios/foto (RN-016)", () => {
  it("acepta JPG, PNG y WebP de hasta 1 MB y devuelve la extensión", () => {
    expect(validatePhoto({ type: "image/jpeg", size: 1000, head: bytes(JPEG) })).toEqual({ ok: true, ext: "jpg" });
    expect(validatePhoto({ type: "image/png", size: 1000, head: bytes(PNG) })).toEqual({ ok: true, ext: "png" });
    expect(validatePhoto({ type: "image/webp", size: MAX_PHOTO_BYTES, head: bytes(WEBP) })).toEqual({ ok: true, ext: "webp" });
  });

  it("rechaza archivos de más de 1 MB o vacíos", () => {
    expect(validatePhoto({ type: "image/jpeg", size: MAX_PHOTO_BYTES + 1, head: bytes(JPEG) })).toEqual({ ok: false, error: "too_large" });
    expect(validatePhoto({ type: "image/jpeg", size: 0, head: bytes([]) })).toEqual({ ok: false, error: "empty" });
  });

  it("rechaza otros formatos, incluso con una extensión engañosa", () => {
    expect(validatePhoto({ type: "image/gif", size: 1000, head: bytes(JPEG) })).toEqual({ ok: false, error: "unsupported_type" });
    expect(validatePhoto({ type: "image/svg+xml", size: 1000, head: bytes(JPEG) })).toEqual({ ok: false, error: "unsupported_type" });
    // Dice JPG pero el contenido es PNG (o cualquier otra cosa).
    expect(validatePhoto({ type: "image/jpeg", size: 1000, head: bytes(PNG) })).toEqual({ ok: false, error: "content_mismatch" });
    expect(validatePhoto({ type: "image/png", size: 1000, head: bytes([0x3c, 0x73, 0x76, 0x67]) })).toEqual({ ok: false, error: "content_mismatch" });
  });

  it("reconoce las fotos del propio bucket para poder borrar la anterior", () => {
    const base = "https://xilzwjudufoplgqpzxkx.supabase.co";
    expect(
      avatarPathFromUrl(`${base}/storage/v1/object/public/avatars/u-1/abc.jpg`, base, "u-1"),
    ).toBe("u-1/abc.jpg");
    // La foto de Google o de otro sitio no es nuestra: no se borra.
    expect(avatarPathFromUrl("https://lh3.googleusercontent.com/a/x", base, "u-1")).toBeNull();
    expect(avatarPathFromUrl(`${base}/storage/v1/object/public/otro/u-1/abc.jpg`, base, "u-1")).toBeNull();
    expect(avatarPathFromUrl(null, base, "u-1")).toBeNull();
  });

  it("sirve para cualquier bucket y carpeta (imágenes de productos)", () => {
    const base = "https://xilzwjudufoplgqpzxkx.supabase.co";
    const prefix = `${base}/storage/v1/object/public`;
    expect(ownedStoragePath(`${prefix}/products/p-1/x.webp`, base, "products", "p-1")).toBe("p-1/x.webp");
    expect(ownedStoragePath(`${prefix}/products/p-2/x.webp`, base, "products", "p-1")).toBeNull();
    expect(ownedStoragePath(`${prefix}/avatars/p-1/x.webp`, base, "products", "p-1")).toBeNull();
  });

  it("nunca devuelve una foto de la carpeta de otro usuario", () => {
    const base = "https://xilzwjudufoplgqpzxkx.supabase.co";
    const prefix = `${base}/storage/v1/object/public/avatars`;
    expect(avatarPathFromUrl(`${prefix}/u-2/abc.jpg`, base, "u-1")).toBeNull();
    expect(avatarPathFromUrl(`${prefix}/u-1/../u-2/abc.jpg`, base, "u-1")).toBeNull();
  });
});
