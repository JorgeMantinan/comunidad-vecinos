import {
  communityIdSchema,
  communitySummarySchema,
  createCommunityInputSchema,
  memberSchema,
  membershipIdSchema,
  updateMemberRoleInputSchema,
} from '@comunidad/shared';
import { z } from 'zod';
import { Hono } from 'hono';
import type { Database } from '../../db/client';
import type { Auth } from '../../lib/auth';
import type { AppEnv } from '../../lib/context';
import { jsonBody, pathParams, toIso } from '../../lib/http';
import { notFound } from '../../lib/errors';
import { requireAuth } from '../../middleware/require-auth';
import {
  adminRoles,
  anyMemberRoles,
  requireCommunityRole,
} from '../../middleware/require-community-role';
import { findCommunityOfUser, listCommunitiesOfUser, listMembers } from './repository';
import { changeMemberRole, createCommunity, removeMember } from './service';

const communityParamsSchema = z.object({ id: communityIdSchema });
const memberParamsSchema = z.object({
  id: communityIdSchema,
  memberId: membershipIdSchema,
});

export function communityRoutes(db: Database, auth: Auth): Hono<AppEnv> {
  const routes = new Hono<AppEnv>();

  /** Comunidades del usuario actual. */
  routes.get('/', requireAuth(auth), async (c) => {
    const rows = await listCommunitiesOfUser(db, c.get('user').id);
    return c.json(
      z
        .array(communitySummarySchema)
        .parse(rows.map((row) => ({ ...row, createdAt: toIso(row.createdAt) }))),
    );
  });

  /** Crea una comunidad; el creador queda como presidente. */
  routes.post('/', requireAuth(auth), async (c) => {
    const input = await jsonBody(createCommunityInputSchema, c);
    const community = await createCommunity(db, c.get('user'), input);
    return c.json(
      communitySummarySchema.parse({
        ...community,
        createdAt: toIso(community.createdAt),
      }),
      201,
    );
  });

  /** Detalle de una comunidad (solo miembros). */
  routes.get(
    '/:id',
    requireAuth(auth),
    requireCommunityRole(db, anyMemberRoles),
    async (c) => {
      const { id } = pathParams(communityParamsSchema, c.req.param());
      const community = await findCommunityOfUser(db, c.get('user').id, id);
      if (!community) {
        throw notFound('Comunidad no encontrada');
      }
      return c.json(
        communitySummarySchema.parse({
          ...community,
          createdAt: toIso(community.createdAt),
        }),
      );
    },
  );

  /** Miembros de la comunidad (cualquier miembro puede verlos). */
  routes.get(
    '/:id/members',
    requireAuth(auth),
    requireCommunityRole(db, anyMemberRoles),
    async (c) => {
      const { id } = pathParams(communityParamsSchema, c.req.param());
      const members = await listMembers(db, id);
      return c.json(
        z.array(memberSchema).parse(
          members.map((member) => ({
            ...member,
            createdAt: toIso(member.createdAt),
          })),
        ),
      );
    },
  );

  /** Cambia el rol de un miembro (owner o admin según la matriz). */
  routes.patch(
    '/:id/members/:memberId',
    requireAuth(auth),
    requireCommunityRole(db, adminRoles),
    async (c) => {
      const { id, memberId } = pathParams(memberParamsSchema, c.req.param());
      const { role } = await jsonBody(updateMemberRoleInputSchema, c);
      await changeMemberRole(
        db,
        c.get('user'),
        c.get('membership').role,
        id,
        memberId,
        role,
      );
      return c.json({ ok: true });
    },
  );

  /** Elimina un miembro de la comunidad. */
  routes.delete(
    '/:id/members/:memberId',
    requireAuth(auth),
    requireCommunityRole(db, adminRoles),
    async (c) => {
      const { id, memberId } = pathParams(memberParamsSchema, c.req.param());
      await removeMember(db, c.get('user'), c.get('membership').role, id, memberId);
      return c.json({ ok: true });
    },
  );

  return routes;
}
