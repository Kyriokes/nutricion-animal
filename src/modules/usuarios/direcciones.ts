import { z } from "zod";

const required = (max: number, label: string) =>
  z.string().trim().min(1, `${label} es obligatoria`).max(max, `${label}: hasta ${max} caracteres`);

// Opcional: un texto vacío o de solo espacios cuenta como "no cargado".
const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

// RN-017: dirección de entrega, como en un delivery de comida.
export const AddressSchema = z
  .object({
    city: required(80, "La ciudad"),
    street: required(120, "La calle"),
    number: required(10, "La altura"),
    floor: optional(10),
    apartment: optional(10),
  })
  .transform(({ floor, apartment, ...rest }) => ({
    ...rest,
    ...(floor ? { floor } : {}),
    ...(apartment ? { apartment } : {}),
  }));

export type Address = z.infer<typeof AddressSchema>;

// Límite razonable para que la lista del perfil no crezca sin control.
export const MAX_ADDRESSES = 10;

export function canAddAddress(currentCount: number): boolean {
  return currentCount < MAX_ADDRESSES;
}

// Ej.: "Av. Corrientes 1234, piso 4, depto. B, CABA".
export function formatAddress(a: Address): string {
  return [
    `${a.street} ${a.number}`,
    a.floor && `piso ${a.floor}`,
    a.apartment && `depto. ${a.apartment}`,
    a.city,
  ]
    .filter(Boolean)
    .join(", ");
}
