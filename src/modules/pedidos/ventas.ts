import { z } from "zod";
import type { OrderStatus } from "./estados";

// RN-090: una venta es un pedido que se pagó y sigue en pie (no se canceló
// ni se rechazó después). Se fecha por el momento del pago.
export const SALE_STATUSES: readonly OrderStatus[] = ["paid", "preparing", "shipping", "received"];

// Argentina usa UTC-3 todo el año (sin horario de verano).
const AR_OFFSET = "-03:00";
const AR_OFFSET_MS = 3 * 3_600_000;

// Fecha y mes de hoy en Buenos Aires: "2026-10-09" y "2026-10".
export function todayInBuenosAires(now: Date): { date: string; month: string } {
  const date = new Date(now.getTime() - AR_OFFSET_MS).toISOString().slice(0, 10);
  return { date, month: date.slice(0, 7) };
}

// Fecha real: "2026-02-30" no existe (JavaScript la pasaría al 2 de marzo).
function isValidDate(s: string): boolean {
  const d = new Date(`${s}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(s);
}

// Filtros de /admin/ventas, leídos de la URL. Por defecto, el día de hoy
// (RN-090). Lo inválido vuelve al valor por defecto.
export function SalesFilterSchema(now: Date) {
  const today = todayInBuenosAires(now);
  return z.object({
    periodo: z.enum(["dia", "mes", "todo"]).catch("dia"),
    fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(isValidDate).catch(today.date),
    mes: z
      .string()
      .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
      .catch(today.month),
    pagina: z.coerce.number().int().min(1).max(10_000).catch(1),
  });
}

export type SalesFilter = z.infer<ReturnType<typeof SalesFilterSchema>>;

// Rango [from, to) del período, en hora de Buenos Aires; null = todo.
export function periodRange(f: Pick<SalesFilter, "periodo" | "fecha" | "mes">): { from: Date; to: Date } | null {
  if (f.periodo === "todo") return null;
  if (f.periodo === "dia") {
    const from = new Date(`${f.fecha}T00:00:00${AR_OFFSET}`);
    return { from, to: new Date(from.getTime() + 24 * 3_600_000) };
  }
  const [year, month] = f.mes.split("-").map(Number);
  const next = month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, "0")}`;
  return {
    from: new Date(`${f.mes}-01T00:00:00${AR_OFFSET}`),
    to: new Date(`${next}-01T00:00:00${AR_OFFSET}`),
  };
}
