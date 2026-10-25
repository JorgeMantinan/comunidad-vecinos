import { sql } from 'drizzle-orm';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Database } from './client';

/**
 * Copia de seguridad de datos (ver `docs/privacy-and-retention.md`).
 *
 * - El esquema vive en las migraciones de Git (no se vuelca).
 * - Los datos se vuelcan a JSON con el orden de inserción respetando
 *   las claves foráneas, de modo que la restauración es determinista
 *   sobre una base recién migrada.
 * - Una copia NO sustituye a las copias del proveedor (Neon): son la
 *   red de seguridad exportable e independiente.
 */
export const BACKUP_FORMAT = 'comunidad-vecinos/backup-v1';

/** Orden de inserción: padres antes que hijos. */
export const TABLE_ORDER: readonly string[] = [
  'user',
  'communities',
  'community_memberships',
  'units',
  'session',
  'account',
  'verification',
  'incidents',
  'incident_photos',
  'meetings',
  'meeting_agenda_items',
  'agreements',
  'tasks',
  'expenses',
  'invoices',
  'assessments',
  'assessment_charges',
  'announcements',
  'polls',
  'poll_options',
  'poll_votes',
  'suggestions',
  'professionals',
  'documents',
  'document_templates',
  'assets',
  'maintenance_contracts',
  'sponsorships',
  'sponsorship_communities',
  'invitations',
  'audit_events',
];

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  exportedAt: string;
  tables: Record<string, unknown[]>;
}

export async function createBackup(db: Database): Promise<BackupFile> {
  const tables: Record<string, unknown[]> = {};
  for (const table of TABLE_ORDER) {
    const result = await db.execute(sql.raw(`select * from "${table}"`));
    tables[table] = result.map((row) => ({ ...row }));
  }
  return {
    format: BACKUP_FORMAT,
    exportedAt: new Date().toISOString(),
    tables,
  };
}

/** Literal SQL seguro para valores JSON. */
export function toSqlLiteral(value: unknown): string {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (typeof value === 'object') {
    return `'${JSON.stringify(value).replaceAll("'", "''")}'::jsonb`;
  }
  return `'${String(value).replaceAll("'", "''")}'`;
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
    const backup = await createBackup(connection.db);
    mkdirSync(join(process.cwd(), 'backups'), { recursive: true });
    const filename = `backup-${backup.exportedAt.replaceAll(':', '-')}.json`;
    const target = join(process.cwd(), 'backups', filename);
    writeFileSync(target, JSON.stringify(backup, null, 2), 'utf8');
    const counts = Object.entries(backup.tables)
      .filter(([, rows]) => rows.length > 0)
      .map(([name, rows]) => `${name}=${rows.length}`)
      .join(' ');
    console.info(`Copia guardada en ${target}`);
    console.info(`Filas: ${counts}`);
  } finally {
    await connection.close();
  }
}
