import type { Result } from "@/lib/result";
import { normalizeHex, type Hex } from "./color";

const HOSTS = new Set(["coolors.co", "www.coolors.co"]);
const MIN_COLORS = 2;
const MAX_COLORS = 10;

// RN-071: toma los colores de un enlace de coolors.co. Los colores van en el
// último tramo de la ruta, separados por "-" (con o sin "/palette/").
export function parseCoolorsUrl(
  url: string,
): Result<{ colors: Hex[] }, "invalid_url" | "no_colors"> {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return { ok: false, error: "invalid_url" };
  }
  if (!HOSTS.has(parsed.hostname)) return { ok: false, error: "invalid_url" };

  const last = parsed.pathname.split("/").filter(Boolean).at(-1) ?? "";
  const colors = last.split("-").map(normalizeHex);
  const valid = colors.every((c): c is Hex => c !== null);
  if (!valid || colors.length < MIN_COLORS || colors.length > MAX_COLORS) {
    return { ok: false, error: "no_colors" };
  }
  return { ok: true, colors };
}

// RN-071: enlace para abrir la paleta actual en coolors.co.
export function toCoolorsUrl(colors: readonly Hex[]): string {
  const unique = [
    ...new Set(colors.map((c) => (normalizeHex(c) ?? c).slice(1))),
  ];
  return `https://coolors.co/${unique.join("-")}`;
}
