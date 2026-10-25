import {
  communityIdSchema,
  createProfessionalInputSchema,
  professionalSchema,
  updateProfessionalInputSchema,
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
import { listProfessionals } from './repository';
import { addProfessional, editProfessional, removeProfessional } from './service';

const communityParams = z.object({ id: communityIdSchema });
const professionalParams = z.object({
  id: communityIdSchema,
  professionalId: z.string().min(1),
});

const serialize = (row: Awaited<ReturnType<typeof listProfessionals>>[number]) =>
  professionalSchema.parse({ ...row, createdAt: toIso(row.createdAt) });

/**
 * Profesionales recomendados por la comunidad (recomendación vecinal,
 * nunca publicidad patrocinada: los patrocinios son Fase 5).
 */
export function professionalRoutes(db: Database, auth: Auth): Hono<AppEnv> {
  const routes = new Hono<AppEnv>();

  routes.get(
    '/:id/professionals',
    requireAuth(auth),
    requireCommunityRole(db, anyMemberRoles),
    async (c) => {
      const { id } = pathParams(communityParams, c.req.param());
      const rows = await listProfessionals(db, id);
      return c.json(z.array(professionalSchema).parse(rows.map(serialize)));
    },
  );

  routes.post(
    '/:id/professionals',
    requireAuth(auth),
    requireCommunityRole(db, adminRoles),
    async (c) => {
      const { id } = pathParams(communityParams, c.req.param());
      const input = await jsonBody(createProfessionalInputSchema, c);
      const user = c.get('user');
      const professional = await addProfessional(
        db,
        { id: user.id, name: user.name },
        id,
        input,
      );
      return c.json(serialize(professional), 201);
    },
  );

  routes.patch(
    '/:id/professionals/:professionalId',
    requireAuth(auth),
    requireCommunityRole(db, adminRoles),
    async (c) => {
      const { id, professionalId } = pathParams(professionalParams, c.req.param());
      const input = await jsonBody(updateProfessionalInputSchema, c);
      const user = c.get('user');
      await editProfessional(
        db,
        { id: user.id, name: user.name },
        id,
        professionalId,
        input,
      );
      return c.json({ ok: true });
    },
  );

  routes.delete(
    '/:id/professionals/:professionalId',
    requireAuth(auth),
    requireCommunityRole(db, adminRoles),
    async (c) => {
      const { id, professionalId } = pathParams(professionalParams, c.req.param());
      const user = c.get('user');
      await removeProfessional(
        db,
        { id: user.id, name: user.name },
        id,
        professionalId,
      );
      return c.json({ ok: true });
    },
  );

  return routes;
}
