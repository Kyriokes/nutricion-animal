import { and, count, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { pageWithin } from "@/lib/paginas";
import { canSendMore, type ContactMessage } from "./mensajes";
import { contactMessages } from "./tables";

// RN-080: guarda un mensaje si ese email no pasó el tope de la última hora.
// Cuenta e inserta en una transacción con un bloqueo por email, así varios
// envíos simultáneos no pasan el tope.
export async function saveContactMessage(
  msg: ContactMessage,
  userId: string | null,
): Promise<{ ok: true } | { ok: false; error: "too_many" }> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`contact:${msg.email}`}))`);
    const [{ n }] = await tx
      .select({ n: count() })
      .from(contactMessages)
      .where(and(eq(contactMessages.email, msg.email), gt(contactMessages.createdAt, sql`now() - interval '1 hour'`)));
    if (!canSendMore(n)) return { ok: false as const, error: "too_many" as const };
    await tx.insert(contactMessages).values({ ...msg, userId });
    return { ok: true as const };
  });
}

export const MESSAGES_PAGE_SIZE = 20;

// Bandeja del admin: los más nuevos primero; `onlyNew` filtra los no leídos.
export async function listContactMessages(onlyNew: boolean, requestedPage: number) {
  const where = onlyNew ? isNull(contactMessages.readAt) : undefined;
  const [{ total }] = await db.select({ total: count() }).from(contactMessages).where(where);
  const { page, pages } = pageWithin(requestedPage, total, MESSAGES_PAGE_SIZE);
  const rows = await db
    .select({
      id: contactMessages.id,
      name: contactMessages.name,
      email: contactMessages.email,
      subject: contactMessages.subject,
      readAt: contactMessages.readAt,
      createdAt: contactMessages.createdAt,
    })
    .from(contactMessages)
    .where(where)
    .orderBy(desc(contactMessages.createdAt), desc(contactMessages.id))
    .limit(MESSAGES_PAGE_SIZE)
    .offset((page - 1) * MESSAGES_PAGE_SIZE);
  return { messages: rows, total, page, pages };
}

// Detalle de un mensaje. La primera vez que el admin lo abre, queda leído.
export async function openContactMessage(id: string) {
  const [row] = await db.select().from(contactMessages).where(eq(contactMessages.id, id));
  if (!row) return null;
  if (!row.readAt) {
    await db
      .update(contactMessages)
      .set({ readAt: sql`now()` })
      .where(and(eq(contactMessages.id, id), isNull(contactMessages.readAt)));
  }
  return row;
}
