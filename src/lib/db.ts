import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// Conexión única a Postgres para Drizzle (DT-018). Solo servidor: DATABASE_URL
// no lleva NEXT_PUBLIC_, así que nunca llega al navegador.
// En desarrollo se reutiliza entre recargas en caliente para no abrir una
// conexión nueva por cada cambio de archivo.
const globalForDb = globalThis as unknown as {
  pgClient?: ReturnType<typeof postgres>;
};

// DT-061: en Vercel cada instancia abre sus propias conexiones contra el
// transaction pooler de Supabase (puerto 6543). Pocas por instancia, que se
// cierran si quedan sin uso, y un límite para conectar: así no se agotan las
// conexiones del plan gratuito ni una consulta queda colgada.
const client =
  globalForDb.pgClient ??
  postgres(process.env.DATABASE_URL!, {
    // Necesario con el transaction pooler: no admite sentencias preparadas.
    prepare: false,
    max: process.env.NODE_ENV === "production" ? 5 : 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });

if (process.env.NODE_ENV !== "production") globalForDb.pgClient = client;

export const db = drizzle(client);
