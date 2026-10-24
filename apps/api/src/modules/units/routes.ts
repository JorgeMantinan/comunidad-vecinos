import {
  communityIdSchema,
  createUnitInputSchema,
  unitSchema,
} from '@comunidad/shared';
import { z } from 'zod';
import { Hono } from 'hono';
import type { Database } from '../../db/client';
import type { Auth } from '../../lib/auth';
import type { AppEnv } from '../../lib/context';
import { jsonBody, pathParams, toIso } from '../../lib/http';
import { requireAuth } from '../../middleware/require-auth';
import {
  adminRoles,
  anyMemberRoles,
  requireCommunityRole,
} from '../../middleware/require-community-role';
import { listUnits } from './repository';
import { addUnit, removeUnit } from './service';

const communityParams = z.object({ id: communityIdSchema });
const unitParams = z.object({
  id: communityIdSchema,
  unitId: z.string().min(1),
});

const serialize = (row: Awaited<ReturnType<typeof listUnits>>[number]) =>
  unitSchema.parse({ ...row, createdAt: toIso(row.createdAt) });

/** Unidades de la comunidad (viviendas/locales y sus coeficientes). */
export function unitRoutes(db: Database, auth: Auth): Hono<AppEnv> {
  const routes = new Hono<AppEnv>();

  routes.get(
    '/:id/units',
    requireAuth(auth),
    requireCommunityRole(db, anyMemberRoles),
    async (c) => {
      const { id } = pathParams(communityParams, c.req.param());
      const rows = await listUnits(db, id);
      return c.json(z.array(unitSchema).parse(rows.map(serialize)));
    },
  );

  routes.post(
    '/:id/units',
    requireAuth(auth),
    requireCommunityRole(db, adminRoles),
    async (c) => {
      const { id } = pathParams(communityParams, c.req.param());
      const input = await jsonBody(createUnitInputSchema, c);
      const unit = await addUnit(db, c.get('user'), id, input);
      return c.json(serialize(unit), 201);
    },
  );

  routes.delete(
    '/:id/units/:unitId',
    requireAuth(auth),
    requireCommunityRole(db, adminRoles),
    async (c) => {
      const { id, unitId } = pathParams(unitParams, c.req.param());
      await removeUnit(db, c.get('user'), id, unitId);
      return c.json({ ok: true });
    },
  );

  return routes;
}
