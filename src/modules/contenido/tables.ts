import { sql } from "drizzle-orm";
import { check, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "@/modules/usuarios/tables";

// VA-09: páginas de texto editables (FAQ, quiénes somos, términos).
// RLS activado y sin políticas (DT-029).
export const sitePages = pgTable(
  "site_pages",
  {
    slug: text("slug").primaryKey(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
  },
  (t) => [check("site_pages_slug_valid", sql`${t.slug} in ('faq', 'nosotros', 'terminos')`)],
).enableRLS();
