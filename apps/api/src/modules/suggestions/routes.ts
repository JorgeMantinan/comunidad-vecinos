import {
  communityIdSchema,
  createSuggestionInputSchema,
  suggestionSchema,
  updateSuggestionStatusInputSchema,
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
import { listSuggestions } from './repository';
import { createSuggestion, removeSuggestion, setSuggestionStatus } from './service';

const communityParams = z.object({ id: communityIdSchema });
const suggestionParams = z.object({
  id: communityIdSchema,
  suggestionId: z.string().min(1),
});

const serialize = (row: Awaited<ReturnType<typeof listSuggestions>>[number]) =>
  suggestionSchema.parse({ ...row, createdAt: toIso(row.createdAt) });

/**
 * Sugerencias: cualquier miembro propone; la junta/administración
 * revisa el estado; el autor (o la administración) puede eliminar.
 */
export function suggestionRoutes(db: Database, auth: Auth): Hono<AppEnv> {
  const routes = new Hono<AppEnv>();

  routes.get(
    '/:id/suggestions',
    requireAuth(auth),
    requireCommunityRole(db, anyMemberRoles),
    async (c) => {
      const { id } = pathParams(communityParams, c.req.param());
      const rows = await listSuggestions(db, id);
      return c.json(z.array(suggestionSchema).parse(rows.map(serialize)));
    },
  );

  routes.post(
    '/:id/suggestions',
    requireAuth(auth),
    requireCommunityRole(db, anyMemberRoles),
    async (c) => {
      const { id } = pathParams(communityParams, c.req.param());
      const input = await jsonBody(createSuggestionInputSchema, c);
      const user = c.get('user');
      const suggestion = await createSuggestion(
        db,
        { id: user.id, name: user.name, role: c.get('membership').role },
        id,
        input,
      );
      return c.json(serialize(suggestion), 201);
    },
  );

  routes.patch(
    '/:id/suggestions/:suggestionId',
    requireAuth(auth),
    requireCommunityRole(db, adminRoles),
    async (c) => {
      const { id, suggestionId } = pathParams(suggestionParams, c.req.param());
      const { status } = await jsonBody(updateSuggestionStatusInputSchema, c);
      const user = c.get('user');
      await setSuggestionStatus(
        db,
        { id: user.id, name: user.name, role: c.get('membership').role },
        id,
        suggestionId,
        status,
      );
      return c.json({ ok: true });
    },
  );

  routes.delete(
    '/:id/suggestions/:suggestionId',
    requireAuth(auth),
    requireCommunityRole(db, anyMemberRoles),
    async (c) => {
      const { id, suggestionId } = pathParams(suggestionParams, c.req.param());
      const user = c.get('user');
      await removeSuggestion(
        db,
        { id: user.id, name: user.name, role: c.get('membership').role },
        id,
        suggestionId,
      );
      return c.json({ ok: true });
    },
  );

  return routes;
}
