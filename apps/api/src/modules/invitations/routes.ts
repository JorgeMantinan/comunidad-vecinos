import {
  acceptInvitationInputSchema,
  communityIdSchema,
  createInvitationInputSchema,
  invitationSchema,
  pendingInvitationSchema,
} from '@comunidad/shared';
import { z } from 'zod';
import { Hono } from 'hono';
import type { Database } from '../../db/client';
import type { Auth } from '../../lib/auth';
import type { AppEnv } from '../../lib/context';
import type { EmailPort } from '../../lib/email';
import { jsonBody, pathParams, toIso } from '../../lib/http';
import { findCommunityOfUser } from '../communities/repository';
import { requireAuth } from '../../middleware/require-auth';
import {
  adminRoles,
  requireCommunityRole,
} from '../../middleware/require-community-role';
import { listInvitations, listPendingInvitationsForEmail } from './repository';
import { sendInvitationEmail } from './email';
import {
  acceptInvitation,
  createInvitation,
  revokeInvitation,
  toInvitation,
} from './service';

const communityParamsSchema = z.object({ id: communityIdSchema });
const invitationParamsSchema = z.object({
  id: communityIdSchema,
  invitationId: z.string().min(1),
});

export function invitationRoutes(
  db: Database,
  auth: Auth,
  email: EmailPort,
  webBaseUrl: string,
): Hono<AppEnv> {
  const routes = new Hono<AppEnv>();

  /** Crea una invitación. Devuelve el token una única vez. */
  routes.post(
    '/communities/:id/invitations',
    requireAuth(auth),
    requireCommunityRole(db, adminRoles),
    async (c) => {
      const { id } = pathParams(communityParamsSchema, c.req.param());
      const input = await jsonBody(createInvitationInputSchema, c);
      const user = c.get('user');
      const created = await createInvitation(db, user, id, input);

      // El envío se espera antes de responder: en serverless el trabajo
      // tras la respuesta se congela. Sigue siendo best-effort: un fallo
      // de correo jamás bloquea la invitación (queda en la interfaz).
      try {
        const community = await findCommunityOfUser(db, user.id, id);
        await sendInvitationEmail(email, {
          to: input.email,
          communityName: community?.name ?? 'una comunidad',
          role: input.role,
          token: created.token,
          expiresAt: new Date(created.invitation.expiresAt),
          webBaseUrl,
        });
      } catch (error) {
        console.error('[correo] no se pudo enviar la invitación', error);
      }

      return c.json(
        {
          invitation: invitationSchema.parse(created.invitation),
          token: created.token,
        },
        201,
      );
    },
  );

  /** Invitaciones de una comunidad (nunca incluye tokens). */
  routes.get(
    '/communities/:id/invitations',
    requireAuth(auth),
    requireCommunityRole(db, adminRoles),
    async (c) => {
      const { id } = pathParams(communityParamsSchema, c.req.param());
      const rows = await listInvitations(db, id);
      return c.json(
        z.array(invitationSchema).parse(rows.map((row) => toInvitation(row))),
      );
    },
  );

  /** Revoca una invitación pendiente. */
  routes.delete(
    '/communities/:id/invitations/:invitationId',
    requireAuth(auth),
    requireCommunityRole(db, adminRoles),
    async (c) => {
      const { id, invitationId } = pathParams(invitationParamsSchema, c.req.param());
      await revokeInvitation(db, c.get('user'), id, invitationId);
      return c.json({ ok: true });
    },
  );

  /** Invitaciones pendientes dirigidas al email del usuario actual. */
  routes.get('/invitations/pending', requireAuth(auth), async (c) => {
    const email = c.get('user').email.toLowerCase();
    const rows = await listPendingInvitationsForEmail(db, email);
    return c.json(
      z.array(pendingInvitationSchema).parse(
        rows.map((row) => ({
          id: row.id,
          communityId: row.communityId,
          communityName: row.communityName,
          communityAddress: row.communityAddress,
          email: row.email,
          role: row.role,
          invitedByName: row.invitedByName,
          expiresAt: toIso(row.expiresAt),
        })),
      ),
    );
  });

  /** Acepta una invitación con su token. */
  routes.post('/invitations/accept', requireAuth(auth), async (c) => {
    const input = await jsonBody(acceptInvitationInputSchema, c);
    const user = c.get('user');
    const accepted = await acceptInvitation(
      db,
      { id: user.id, email: user.email },
      input,
    );
    return c.json(accepted);
  });

  return routes;
}
