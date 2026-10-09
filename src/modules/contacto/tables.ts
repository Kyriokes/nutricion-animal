import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "@/modules/usuarios/tables";

// RN-080: mensajes del formulario de contacto. `user_id` si lo mandó alguien
// con sesión. `read_at`: cuándo lo abrió el admin por primera vez (hasta
// entonces se marca "nuevo"). RLS activado y sin políticas (DT-029).
export const contactMessages = pgTable(
  "contact_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    email: text("email").notNull(),
    subject: text("subject").notNull(),
    message: text("message").notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("contact_messages_created_idx").on(t.createdAt),
    // Para el tope de mensajes por hora por email.
    index("contact_messages_email_idx").on(t.email, t.createdAt),
  ],
).enableRLS();
