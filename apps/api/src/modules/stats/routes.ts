import { communityIdSchema, communityStatsSchema } from '@comunidad/shared';
import { z } from 'zod';
import { Hono } from 'hono';
import type { Database } from '../../db/client';
import type { Auth } from '../../lib/auth';
import type { AppEnv } from '../../lib/context';
import { pathParams } from '../../lib/http';
import { requireAuth } from '../../middleware/require-auth';
import {
  anyMemberRoles,
  requireCommunityRole,
} from '../../middleware/require-community-role';
import { buildCommunityStats } from './service';

const communityParams = z.object({ id: communityIdSchema });

/** Estadísticas de uso (SQL agregado; ver ADR 006: sin IA). */
export function statsRoutes(db: Database, auth: Auth): Hono<AppEnv> {
  const routes = new Hono<AppEnv>();

  routes.get(
    '/:id/stats',
    requireAuth(auth),
    requireCommunityRole(db, anyMemberRoles),
    async (c) => {
      const { id } = pathParams(communityParams, c.req.param());
      const stats = await buildCommunityStats(db, id);
      return c.json(communityStatsSchema.parse(stats));
    },
  );

  return routes;
}
