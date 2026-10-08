import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// Conexión única a Postgres para Drizzle (DT-018). Solo servidor: DATABASE_URL
// no lleva NEXT_PUBLIC_, así que nunca llega al navegador.
// En desarrollo se reutiliza entre recargas en caliente para no abrir una
// conexión nueva por cada cambio de archivo.
const globalForDb = globalThis as unknown as {
  pgClient?: ReturnType<typeof postgres>;
};

const client =
  globalForDb.pgClient ??
  // prepare: false hace falta con el transaction pooler de Supabase (Vercel).
  postgres(process.env.DATABASE_URL!, { prepare: false });

if (process.env.NODE_ENV !== "production") globalForDb.pgClient = client;

export const db = drizzle(client);
