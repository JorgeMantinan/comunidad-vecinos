import { auditEvents } from '../db/schema';
import type { Database } from '../db/client';
import { newId } from './ids';

export interface AuditEventInput {
  communityId: string;
  actorId: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
}

/**
 * Registra una acción crítica (economía, permisos, acuerdos…).
 * Se invoca de forma síncrona para que los tests puedan verificarlo.
 */
export async function recordAuditEvent(
  db: Database,
  input: AuditEventInput,
): Promise<void> {
  await db.insert(auditEvents).values({
    id: newId('aud'),
    communityId: input.communityId,
    actorId: input.actorId,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId,
    metadata: input.metadata ?? {},
    ipAddress: input.ipAddress,
  });
}
