import { and, gt, isNull, sql } from 'drizzle-orm';
import { platformMetricsSchema } from '@comunidad/shared';
import { Hono } from 'hono';
import type { Database } from '../../db/client';
import type { Auth } from '../../lib/auth';
import type { AppEnv } from '../../lib/context';
import { requirePlatformAdmin } from '../../middleware/require-platform-admin';
import {
  auditEvents,
  communityMemberships,
  communities,
  documents,
  incidentPhotos,
  invitations,
  session,
  user,
} from '../../db/schema';

const count = (value: string | number | null | undefined): number => Number(value ?? 0);

/**
 * Control de cuota (Fase 6): visibilidad del consumo de la base de
 * datos para vigilar los límites gratuitos de los proveedores.
 */
export function platformMetricRoutes(db: Database, auth: Auth): Hono<AppEnv> {
  const routes = new Hono<AppEnv>();

  routes.get('/metrics', requirePlatformAdmin(auth), async (c) => {
    const [
      users,
      comm,
      memberships,
      activeSessions,
      pending,
      audits,
      documentBytes,
      photoBytes,
    ] = await Promise.all([
      db.select({ v: sql<string>`count(*)` }).from(user),
      db.select({ v: sql<string>`count(*)` }).from(communities),
      db.select({ v: sql<string>`count(*)` }).from(communityMemberships),
      db
        .select({ v: sql<string>`count(*)` })
        .from(session)
        .where(gt(session.expiresAt, new Date())),
      db
        .select({ v: sql<string>`count(*)` })
        .from(invitations)
        .where(
          and(isNull(invitations.acceptedAt), gt(invitations.expiresAt, new Date())),
        ),
      db.select({ v: sql<string>`count(*)` }).from(auditEvents),
      db
        .select({ v: sql<string>`coalesce(sum(${documents.sizeBytes}), 0)` })
        .from(documents),
      db
        .select({ v: sql<string>`coalesce(sum(${incidentPhotos.sizeBytes}), 0)` })
        .from(incidentPhotos),
    ]);

    return c.json(
      platformMetricsSchema.parse({
        users: count(users[0]?.v),
        communities: count(comm[0]?.v),
        memberships: count(memberships[0]?.v),
        activeSessions: count(activeSessions[0]?.v),
        pendingInvitations: count(pending[0]?.v),
        auditEvents: count(audits[0]?.v),
        storedBytes: count(documentBytes[0]?.v) + count(photoBytes[0]?.v),
      }),
    );
  });

  return routes;
}
