import { sql } from 'drizzle-orm';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import type { Database } from './client';
import { BACKUP_FORMAT, TABLE_ORDER, toSqlLiteral } from './backup';
import type { BackupFile } from './backup';

const CHUNK_ROWS = 200;

/**
 * Restaura una copia sobre una base ya migrada: vacía todas las
 * tablas en orden inverso y reinserta en orden de dependencias.
 * Operación destructiva: se ejecuta siempre sobre la base indicada.
 */
export async function restoreBackup(
  db: Database,
  backup: BackupFile,
): Promise<Record<string, number>> {
  if (backup.format !== BACKUP_FORMAT) {
    throw new Error(`Formato de copia no reconocido: ${String(backup.format)}`);
  }

  const inserted: Record<string, number> = {};

  await db.transaction(async (tx) => {
    for (const table of [...TABLE_ORDER].reverse()) {
      await tx.execute(sql.raw(`DELETE FROM "${table}"`));
    }

    for (const table of TABLE_ORDER) {
      const rows = (backup.tables[table] ?? []) as Array<Record<string, unknown>>;
      inserted[table] = rows.length;
      if (rows.length === 0) {
        continue;
      }

      const columns = Object.keys(rows[0] ?? {});
      for (let index = 0; index < rows.length; index += CHUNK_ROWS) {
        const batch = rows.slice(index, index + CHUNK_ROWS);
        const values = batch
          .map(
            (row) =>
              `(${columns.map((column) => toSqlLiteral(row[column])).join(', ')})`,
          )
          .join(', ');
        await tx.execute(
          sql.raw(
            `INSERT INTO "${table}" ("${columns.join('","')}") VALUES ${values} ON CONFLICT DO NOTHING`,
          ),
        );
      }
    }
  });

  return inserted;
}

const isMainModule = () =>
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule()) {
  const filename = process.argv[2];
  if (!filename) {
    console.error(
      'Uso: pnpm --filter @comunidad/api db:restore -- backups/archivo.json',
    );
    process.exit(1);
  }

  const { loadConfig } = await import('../config');
  const { createDatabase } = await import('./client');
  const { createLocalDatabase } = await import('./local');

  const config = loadConfig();
  const connection = config.databaseUrl
    ? { db: createDatabase(config.databaseUrl), close: async () => {} }
    : await createLocalDatabase();

  try {
    const backup = JSON.parse(readFileSync(filename, 'utf8')) as BackupFile;
    const counts = await restoreBackup(connection.db, backup);
    const summary = Object.entries(counts)
      .filter(([, value]) => value > 0)
      .map(([name, value]) => `${name}=${value}`)
      .join(' ');
    console.info(`Copia restaurada desde ${filename}`);
    console.info(`Filas: ${summary}`);
  } finally {
    await connection.close();
  }
}
