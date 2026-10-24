import {
  auditEventSchema,
  communityIdSchema,
  listAuditEventsQuerySchema,
} from '@comunidad/shared';
import { z } from 'zod';
import { Hono } from 'hono';
import type { Database } from '../../db/client';
import type { Auth } from '../../lib/auth';
import type { AppEnv } from '../../lib/context';
import { pathParams, toIso } from '../../lib/http';
import { requireAuth } from '../../middleware/require-auth';
import {
  adminRoles,
  requireCommunityRole,
} from '../../middleware/require-community-role';
import { listAuditEvents } from './repository';

const communityParamsSchema = z.object({ id: communityIdSchema });

/** Registro de acciones críticas, visible por presidentes y administradores. */
export function auditRoutes(db: Database, auth: Auth): Hono<AppEnv> {
  const routes = new Hono<AppEnv>();

  routes.get(
    '/:id/audit-events',
    requireAuth(auth),
    requireCommunityRole(db, adminRoles),
    async (c) => {
      const { id } = pathParams(communityParamsSchema, c.req.param());
      const { limit } = listAuditEventsQuerySchema.parse({
        limit: c.req.query('limit') ?? undefined,
      });
      const rows = await listAuditEvents(db, id, limit);
      return c.json(
        z
          .array(auditEventSchema)
          .parse(rows.map((row) => ({ ...row, createdAt: toIso(row.createdAt) }))),
      );
    },
  );

  return routes;
}
