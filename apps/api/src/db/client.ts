import { drizzle } from 'drizzle-orm/postgres-js';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

/**
 * Único tipo de base de datos en toda la aplicación: `postgres-js`.
 * En tests se conecta a un socket de PGlite (PostgreSQL embebido),
 * por lo que runtime y tests usan exactamente el mismo driver.
 */
export type Database = PostgresJsDatabase<typeof schema>;

export function createDatabase(connectionString: string): Database {
  const client = postgres(connectionString, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    // Requerido con el pooler de Neon (PgBouncer en modo transacción).
    prepare: false,
  });
  return drizzle(client, { schema });
}
