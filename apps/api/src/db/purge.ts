import { and, isNull, lt } from 'drizzle-orm';
import { pathToFileURL } from 'node:url';
import type { Database } from './client';
import { auditEvents, invitations } from './schema';

export interface PurgeResult {
  invitations: number;
  auditEvents: number;
}

export interface PurgeOptions {
  now?: Date;
  /** Días que se conserva una invitación caducada (por defecto 90). */
  invitationRetentionDays?: number;
  /** Meses que se conserva la auditoría (por defecto 24). */
  auditRetentionMonths?: number;
}

/**
 * Purga según `docs/privacy-and-retention.md`:
 * - invitaciones caducadas hace más de 90 días (no aceptadas ni revocadas);
 * - eventos de auditoría con más de 24 meses.
 */
export async function runPurge(
  db: Database,
  options: PurgeOptions = {},
): Promise<PurgeResult> {
  const now = options.now ?? new Date();
  const invitationCutoff = new Date(
    now.getTime() - (options.invitationRetentionDays ?? 90) * 24 * 3600_000,
  );
  const auditCutoff = new Date(now);
  auditCutoff.setUTCMonth(
    auditCutoff.getUTCMonth() - (options.auditRetentionMonths ?? 24),
  );

  const deletedInvitations = await db
    .delete(invitations)
    .where(
      and(
        isNull(invitations.acceptedAt),
        isNull(invitations.revokedAt),
        lt(invitations.expiresAt, invitationCutoff),
      ),
    )
    .returning({ id: invitations.id });

  const deletedAudit = await db
    .delete(auditEvents)
    .where(lt(auditEvents.createdAt, auditCutoff))
    .returning({ id: auditEvents.id });

  return {
    invitations: deletedInvitations.length,
    auditEvents: deletedAudit.length,
  };
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
    const result = await runPurge(connection.db);
    console.info(
      `Purga completada: invitaciones=${result.invitations} auditoría=${result.auditEvents}`,
    );
  } finally {
    await connection.close();
  }
}
