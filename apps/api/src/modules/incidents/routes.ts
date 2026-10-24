import {
  communityIdSchema,
  createIncidentInputSchema,
  incidentSchema,
  updateIncidentInputSchema,
} from '@comunidad/shared';
import { z } from 'zod';
import { Hono } from 'hono';
import type { Database } from '../../db/client';
import type { Auth } from '../../lib/auth';
import type { AppEnv } from '../../lib/context';
import { jsonBody, pathParams, toIso, toIsoOrNull } from '../../lib/http';
import { requireAuth } from '../../middleware/require-auth';
import {
  adminRoles,
  anyMemberRoles,
  requireCommunityRole,
} from '../../middleware/require-community-role';
import { listIncidents } from './repository';
import { removeIncident, reportIncident, updateIncident } from './service';

const communityParams = z.object({ id: communityIdSchema });
const incidentParams = z.object({
  id: communityIdSchema,
  incidentId: z.string().min(1),
});

const serialize = (row: Awaited<ReturnType<typeof listIncidents>>[number]) =>
  incidentSchema.parse({
    ...row,
    resolvedAt: toIsoOrNull(row.resolvedAt),
    createdAt: toIso(row.createdAt),
  });

/**
 * Incidencias: cualquier miembro las reporta; solo owner/admin las
 * gestionan (estado, edición, borrado).
 */
export function incidentRoutes(db: Database, auth: Auth): Hono<AppEnv> {
  const routes = new Hono<AppEnv>();

  routes.get(
    '/:id/incidents',
    requireAuth(auth),
    requireCommunityRole(db, anyMemberRoles),
    async (c) => {
      const { id } = pathParams(communityParams, c.req.param());
      const rows = await listIncidents(db, id);
      return c.json(z.array(incidentSchema).parse(rows.map(serialize)));
    },
  );

  routes.post(
    '/:id/incidents',
    requireAuth(auth),
    requireCommunityRole(db, anyMemberRoles),
    async (c) => {
      const { id } = pathParams(communityParams, c.req.param());
      const input = await jsonBody(createIncidentInputSchema, c);
      const user = c.get('user');
      const incident = await reportIncident(
        db,
        { id: user.id, name: user.name },
        id,
        input,
      );
      return c.json(serialize(incident), 201);
    },
  );

  routes.patch(
    '/:id/incidents/:incidentId',
    requireAuth(auth),
    requireCommunityRole(db, adminRoles),
    async (c) => {
      const { id, incidentId } = pathParams(incidentParams, c.req.param());
      const input = await jsonBody(updateIncidentInputSchema, c);
      await updateIncident(db, c.get('user'), id, incidentId, input);
      return c.json({ ok: true });
    },
  );

  routes.delete(
    '/:id/incidents/:incidentId',
    requireAuth(auth),
    requireCommunityRole(db, adminRoles),
    async (c) => {
      const { id, incidentId } = pathParams(incidentParams, c.req.param());
      await removeIncident(db, c.get('user'), id, incidentId);
      return c.json({ ok: true });
    },
  );

  return routes;
}
