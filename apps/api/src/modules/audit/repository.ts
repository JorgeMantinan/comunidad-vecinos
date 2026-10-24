import { desc, eq } from 'drizzle-orm';
import type { Database } from '../../db/client';
import { auditEvents } from '../../db/schema';

export interface AuditEventRow {
  id: string;
  action: string;
  actorId: string | null;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  createdAt: Date;
}

/** Últimos eventos de auditoría de una comunidad, primero los más recientes. */
export async function listAuditEvents(
  db: Database,
  communityId: string,
  limit: number,
): Promise<AuditEventRow[]> {
  return db
    .select({
      id: auditEvents.id,
      action: auditEvents.action,
      actorId: auditEvents.actorId,
      targetType: auditEvents.targetType,
      targetId: auditEvents.targetId,
      metadata: auditEvents.metadata,
      ipAddress: auditEvents.ipAddress,
      createdAt: auditEvents.createdAt,
    })
    .from(auditEvents)
    .where(eq(auditEvents.communityId, communityId))
    .orderBy(desc(auditEvents.createdAt))
    .limit(limit);
}
