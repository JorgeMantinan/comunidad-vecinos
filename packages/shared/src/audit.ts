import { z } from 'zod';

/** Evento de auditoría de acciones críticas de una comunidad. */
export const auditEventSchema = z.object({
  id: z.string(),
  action: z.string(),
  actorId: z.string().nullable(),
  targetType: z.string().nullable(),
  targetId: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()),
  ipAddress: z.string().nullable(),
  createdAt: z.iso.datetime(),
});
export type AuditEvent = z.infer<typeof auditEventSchema>;

export const listAuditEventsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
