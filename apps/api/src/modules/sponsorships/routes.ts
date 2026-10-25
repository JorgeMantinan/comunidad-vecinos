import {
  communityIdSchema,
  communitySponsorSchema,
  createSponsorshipInputSchema,
  sponsorshipSchema,
  updateSponsorshipInputSchema,
} from '@comunidad/shared';
import { z } from 'zod';
import { Hono } from 'hono';
import type { Database } from '../../db/client';
import type { Auth } from '../../lib/auth';
import type { AppEnv } from '../../lib/context';
import { jsonBody, pathParams, toIso } from '../../lib/http';
import { requireAuth } from '../../middleware/require-auth';
import {
  anyMemberRoles,
  requireCommunityRole,
} from '../../middleware/require-community-role';
import { requirePlatformAdmin } from '../../middleware/require-platform-admin';
import { listCommunitySponsorships, listSponsorships } from './repository';
import { addSponsorship, editSponsorship, removeSponsorship } from './service';

const sponsorshipParams = z.object({ sponsorshipId: z.string().min(1) });
const communityParams = z.object({ id: communityIdSchema });

const serialize = (row: Awaited<ReturnType<typeof listSponsorships>>[number]) =>
  sponsorshipSchema.parse({
    ...row,
    monthlyAmount: row.monthlyAmount,
    createdAt: toIso(row.createdAt),
  });

/**
 * Gestión de patrocinios (publicidad) a nivel de plataforma.
 * Requiere `PLATFORM_ADMIN_EMAILS`; los patrocinadores no son usuarios
 * y nunca reciben datos de las comunidades.
 */
export function platformSponsorshipRoutes(db: Database, auth: Auth): Hono<AppEnv> {
  const routes = new Hono<AppEnv>();
  const guard = requirePlatformAdmin(auth);

  routes.get('/sponsorships', guard, async (c) => {
    const rows = await listSponsorships(db);
    return c.json(z.array(sponsorshipSchema).parse(rows.map(serialize)));
  });

  routes.post('/sponsorships', guard, async (c) => {
    const input = await jsonBody(createSponsorshipInputSchema, c);
    const sponsorship = await addSponsorship(db, c.get('user'), input);
    return c.json(serialize(sponsorship), 201);
  });

  routes.patch('/sponsorships/:sponsorshipId', guard, async (c) => {
    const { sponsorshipId } = pathParams(sponsorshipParams, c.req.param());
    const input = await jsonBody(updateSponsorshipInputSchema, c);
    await editSponsorship(db, c.get('user'), sponsorshipId, input);
    return c.json({ ok: true });
  });

  routes.delete('/sponsorships/:sponsorshipId', guard, async (c) => {
    const { sponsorshipId } = pathParams(sponsorshipParams, c.req.param());
    await removeSponsorship(db, c.get('user'), sponsorshipId);
    return c.json({ ok: true });
  });

  return routes;
}

/**
 * Publicidad activa mostrada en una comunidad. Cualquier miembro la
 * ve, siempre identificada como publicidad en la interfaz.
 */
export function communitySponsorshipRoutes(db: Database, auth: Auth): Hono<AppEnv> {
  const routes = new Hono<AppEnv>();

  routes.get(
    '/:id/sponsorships',
    requireAuth(auth),
    requireCommunityRole(db, anyMemberRoles),
    async (c) => {
      const { id } = pathParams(communityParams, c.req.param());
      const rows = await listCommunitySponsorships(db, id);
      return c.json(
        z
          .array(communitySponsorSchema)
          .parse(rows.map((row) => ({ ...row, advertising: true as const }))),
      );
    },
  );

  return routes;
}
