// Color en hex normalizado: "#" + 6 dígitos en minúscula.
export type Hex = string;

const HEX_PATTERN = /^#?([0-9a-f]{6})$/;

// Acepta con o sin "#" y en mayúsculas; solo 6 dígitos.
export function normalizeHex(input: string): Hex | null {
  const match = input.trim().toLowerCase().match(HEX_PATTERN);
  return match ? `#${match[1]}` : null;
}

function channels(hex: Hex): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex(rgb: readonly number[]): Hex {
  return `#${rgb.map((c) => Math.round(c).toString(16).padStart(2, "0")).join("")}`;
}

// Luminancia relativa según WCAG 2.x (sRGB).
function luminance(hex: Hex): number {
  const [r, g, b] = channels(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// RN-072: relación de contraste WCAG, de 1 a 21. Simétrica.
export function contrastRatio(a: Hex, b: Hex): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// Interpolación lineal por canal sRGB; weightOfA = 1 devuelve a.
export function mix(a: Hex, b: Hex, weightOfA: number): Hex {
  const ca = channels(a);
  const cb = channels(b);
  return toHex(ca.map((c, i) => c * weightOfA + cb[i] * (1 - weightOfA)));
}

// El candidato que más contrasta con el fondo.
export function bestTextOn(bg: Hex, candidates: readonly Hex[]): Hex {
  return candidates.reduce((best, c) =>
    contrastRatio(c, bg) > contrastRatio(best, bg) ? c : best,
  );
}
