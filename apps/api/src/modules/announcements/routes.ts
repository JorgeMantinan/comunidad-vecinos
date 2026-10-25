import {
  announcementSchema,
  communityIdSchema,
  createAnnouncementInputSchema,
  updateAnnouncementInputSchema,
} from '@comunidad/shared';
import { z } from 'zod';
import { Hono } from 'hono';
import type { Database } from '../../db/client';
import type { Auth } from '../../lib/auth';
import type { AppEnv } from '../../lib/context';
import type { EmailPort } from '../../lib/email';
import { jsonBody, pathParams, toIso, toIsoOrNull } from '../../lib/http';
import { findCommunityOfUser } from '../communities/repository';
import { requireAuth } from '../../middleware/require-auth';
import {
  adminRoles,
  anyMemberRoles,
  requireCommunityRole,
} from '../../middleware/require-community-role';
import { sendAnnouncementEmail } from './email';
import { listAnnouncements, listMemberEmails } from './repository';
import { editAnnouncement, publishAnnouncement, removeAnnouncement } from './service';

const announcementParamsSchema = z.object({
  id: communityIdSchema,
  announcementId: z.string().min(1),
});

const serialize = (row: Awaited<ReturnType<typeof listAnnouncements>>[number]) =>
  announcementSchema.parse({
    ...row,
    publishedAt: toIso(row.publishedAt),
    expiresAt: toIsoOrNull(row.expiresAt),
  });

/** Avisos de la comunidad: lectura para miembros, escritura para admin. */
export function announcementRoutes(
  db: Database,
  auth: Auth,
  email: EmailPort,
  webBaseUrl: string,
): Hono<AppEnv> {
  const routes = new Hono<AppEnv>();

  routes.get(
    '/:id/announcements',
    requireAuth(auth),
    requireCommunityRole(db, anyMemberRoles),
    async (c) => {
      const { id } = pathParams(z.object({ id: communityIdSchema }), c.req.param());
      const rows = await listAnnouncements(db, id);
      return c.json(z.array(announcementSchema).parse(rows.map(serialize)));
    },
  );

  routes.post(
    '/:id/announcements',
    requireAuth(auth),
    requireCommunityRole(db, adminRoles),
    async (c) => {
      const { id } = pathParams(z.object({ id: communityIdSchema }), c.req.param());
      const input = await jsonBody(createAnnouncementInputSchema, c);
      const user = c.get('user');
      const created = await publishAnnouncement(
        db,
        { id: user.id, name: user.name },
        id,
        input,
      );

      // Notificación por correo a los miembros (best-effort): un fallo
      // de correo jamás bloquea la publicación del aviso.
      try {
        const community = await findCommunityOfUser(db, user.id, id);
        const recipients = await listMemberEmails(db, id, user.id);
        await Promise.all(
          recipients.map((to) =>
            sendAnnouncementEmail(email, {
              to,
              communityName: community?.name ?? 'tu comunidad',
              title: input.title,
              body: input.body,
              webBaseUrl,
            }).catch((error: unknown) => {
              console.error('[correo] aviso no enviado', error);
            }),
          ),
        );
      } catch (error) {
        console.error('[correo] aviso no notificado', error);
      }

      return c.json(serialize(created), 201);
    },
  );

  routes.patch(
    '/:id/announcements/:announcementId',
    requireAuth(auth),
    requireCommunityRole(db, adminRoles),
    async (c) => {
      const { id, announcementId } = pathParams(
        announcementParamsSchema,
        c.req.param(),
      );
      const input = await jsonBody(updateAnnouncementInputSchema, c);
      const user = c.get('user');
      await editAnnouncement(
        db,
        { id: user.id, name: user.name },
        id,
        announcementId,
        input,
      );
      return c.json({ ok: true });
    },
  );

  routes.delete(
    '/:id/announcements/:announcementId',
    requireAuth(auth),
    requireCommunityRole(db, adminRoles),
    async (c) => {
      const { id, announcementId } = pathParams(
        announcementParamsSchema,
        c.req.param(),
      );
      const user = c.get('user');
      await removeAnnouncement(
        db,
        { id: user.id, name: user.name },
        id,
        announcementId,
      );
      return c.json({ ok: true });
    },
  );

  return routes;
}
