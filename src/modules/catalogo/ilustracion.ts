import { normalizeFoodName } from "@/modules/alimentos/nombres";

// RN-031: dibujo que se muestra cuando un producto no tiene foto.
export type IllustrationKind =
  | "kibble"
  | "raw"
  | "can"
  | "stew"
  | "broth"
  | "treat"
  | "seeds"
  | "supplement"
  | "generic";

// El primero que coincide gana: "caldo de huesos" es un caldo, no un premio.
const KEYWORDS: [IllustrationKind, string[]][] = [
  ["kibble", ["croqueta", "balanceado", "pienso"]],
  ["broth", ["caldo", "sopa"]],
  ["supplement", ["suplemento", "calcio", "omega", "aceite", "vitamina", "tonico", "probiotico"]],
  ["raw", ["crudo", "barf", "congelad"]],
  ["can", ["pate", "lata", "humedo", "mousse"]],
  ["stew", ["guiso", "vianda", "cocido", "estofado"]],
  ["treat", ["snack", "premio", "galleta", "hueso", "deshidratad"]],
  ["seeds", ["semilla", "heno", "alpiste", "mezcla"]],
];

export function illustrationFor(productName: string): IllustrationKind {
  const name = normalizeFoodName(productName);
  return KEYWORDS.find(([, words]) => words.some((w) => name.includes(w)))?.[0] ?? "generic";
}

// Para que dos productos del mismo tipo no se vean idénticos: un número
// entre 0 y `count - 1` que depende solo del nombre.
export function illustrationVariant(productName: string, count: number): number {
  let sum = 0;
  for (const char of productName) sum = (sum * 31 + char.codePointAt(0)!) % 9973;
  return sum % count;
}
