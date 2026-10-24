import { fileURLToPath, pathToFileURL } from 'node:url';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import type { Database } from './client';

/** Carpeta con el SQL generado por Drizzle Kit. */
export const MIGRATIONS_FOLDER = fileURLToPath(
  new URL('../../drizzle', import.meta.url),
);

/** Aplica todas las migraciones pendientes sobre la base de datos. */
export async function runMigrations(db: Database): Promise<void> {
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
}

const isMainModule = () =>
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule()) {
  const { loadConfig } = await import('../config');
  const { createDatabase } = await import('./client');
  const { createLocalDatabase } = await import('./local');

  const config = loadConfig();
  const connection = config.databaseUrl
    ? { db: createDatabase(config.databaseUrl), close: async () => {} }
    : await createLocalDatabase();

  try {
    await runMigrations(connection.db);
    console.info('Migraciones aplicadas correctamente.');
  } finally {
    await connection.close();
  }
}
