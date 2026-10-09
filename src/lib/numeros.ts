// Números como se escriben en Argentina. Solo dos formatos, para no
// interpretar mal "12.5" (¿decimal o miles?):
// - entero o con coma decimal: "12500", "0,5";
// - con punto de miles (solo si se permite, para montos): "12.500,50", "1.234.567".
const PLAIN = /^\d+(,\d+)?$/;
const WITH_THOUSANDS = /^\d{1,3}(\.\d{3})+(,\d+)?$/;

// Vacío → undefined; formato no válido → "invalid".
export function parseArgentineNumber(
  text: string | undefined,
  allowThousands = false,
): number | undefined | "invalid" {
  const t = text?.trim() ?? "";
  if (!t) return undefined;
  if (!PLAIN.test(t) && !(allowThousands && WITH_THOUSANDS.test(t))) return "invalid";
  return Number(t.replace(/\./g, "").replace(",", "."));
}
