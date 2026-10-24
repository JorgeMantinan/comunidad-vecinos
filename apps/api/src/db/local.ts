import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type { Database } from './client';
import * as schema from './schema';

const LOCAL_HOST = '127.0.0.1';
const LOCAL_PORT = 55432;

export interface LocalDatabase {
  db: Database;
  close: () => Promise<void>;
}

/**
 * Base de datos local sin instalar PostgreSQL: PGlite (WASM) expuesto por
 * socket y consumido con el mismo driver `postgres-js` de producción.
 * Requiere los paquetes de desarrollo; no existe en producción.
 */
export async function createLocalDatabase(dataDir = '.pglite'): Promise<LocalDatabase> {
  const pgliteModule = await import('@electric-sql/pglite').catch(() => null);
  const socketModule = await import('@electric-sql/pglite-socket').catch(() => null);
  if (!pgliteModule || !socketModule) {
    throw new Error(
      'No hay DATABASE_URL y los paquetes locales de PGlite no están disponibles. ' +
        'Configura DATABASE_URL en apps/api/.env (ver .env.example).',
    );
  }

  const pglite = new pgliteModule.PGlite(dataDir);
  await pglite.waitReady;

  const server = new socketModule.PGLiteSocketServer({
    db: pglite,
    host: LOCAL_HOST,
    port: LOCAL_PORT,
  });
  await server.start();

  const client = postgres(`postgresql://${server.getServerConn()}/postgres`, {
    max: 1,
  });
  const db = drizzle(client, { schema });

  return {
    db,
    close: async () => {
      await client.end({ timeout: 1 });
      await server.stop();
    },
  };
}
