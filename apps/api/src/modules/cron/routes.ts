import { timingSafeEqual } from 'node:crypto';
import { Hono } from 'hono';
import { createBackup } from '../../db/backup';
import type { Database } from '../../db/client';
import { runPurge } from '../../db/purge';
import type { AppEnv } from '../../lib/context';
import { unauthorized } from '../../lib/errors';
import type { StoragePort } from '../../lib/storage';

/** Las copias se conservan 30 días (docs/privacy-and-retention.md). */
const RETENTION_DAYS = 30;

/**
 * Mantenimiento semanal de producción: **purga por retención** y
 * **copia de seguridad**, en la misma ejecución para no gastar un cron
 * más (Hobby permite 2 y esta es la primera).
 *
 * Vercel Cron llama a esta ruta con `Authorization: Bearer $CRON_SECRET`.
 * El volcado se guarda en el almacén privado (en Vercel el disco de la
 * función es temporal y desaparecería) y las copias de más de 30 días se
 * borran al terminar: el coste se mantiene en centavos.
 */
export function cronRoutes(db: Database, storage: StoragePort): Hono<AppEnv> {
  const routes = new Hono<AppEnv>();

  routes.get('/maintenance', async (c) => {
    if (!isAuthorized(c.req.header('authorization'))) {
      throw unauthorized('Cron no autorizado');
    }

    // Primero la purga: la copia no arrastra datos ya caducados.
    const purge = await runPurge(db);

    const backup = await createBackup(db);
    const key = `backups/backup-${backup.exportedAt.replaceAll(':', '-')}.json`;
    const body = Buffer.from(JSON.stringify(backup), 'utf8');
    await storage.put(key, body, 'application/json');

    const pruned = await pruneBackups(storage, RETENTION_DAYS);
    const rows = Object.values(backup.tables).reduce(
      (total, table) => total + table.length,
      0,
    );

    return c.json({
      ok: true,
      key,
      bytes: body.byteLength,
      rows,
      pruned,
      purge,
    });
  });

  return routes;
}

/** Comparación en tiempo constante del secreto del cron. */
function isAuthorized(header: string | undefined): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !header) {
    return false;
  }
  const provided = Buffer.from(header.replace(/^Bearer\s+/i, ''));
  const expected = Buffer.from(secret);
  if (provided.length !== expected.length) {
    return false;
  }
  return timingSafeEqual(provided, expected);
}

/**
 * Borra las copias anteriores al periodo de retención. La fecha vive en
 * la propia clave (`backups/backup-AAAA-MM-DD…`), así que no hace falta
 * consultar metadatos al proveedor.
 */
export async function pruneBackups(
  storage: StoragePort,
  retentionDays: number,
): Promise<string[]> {
  const cutoff = new Date(Date.now() - retentionDays * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const entries = await storage.list('backups/backup-');
  const deleted: string[] = [];

  for (const entry of entries) {
    const match = /^backups\/backup-(\d{4}-\d{2}-\d{2})/.exec(entry.key);
    if (match?.[1] && match[1] < cutoff) {
      await storage.delete(entry.key);
      deleted.push(entry.key);
    }
  }
  return deleted;
}
