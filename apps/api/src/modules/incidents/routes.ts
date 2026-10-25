import {
  communityIdSchema,
  createIncidentInputSchema,
  incidentPhotoSchema,
  incidentSchema,
  signedDownloadSchema,
  updateIncidentInputSchema,
  uploadPhotoInputSchema,
} from '@comunidad/shared';
import { z } from 'zod';
import { Hono } from 'hono';
import type { Database } from '../../db/client';
import type { Auth } from '../../lib/auth';
import type { AppEnv } from '../../lib/context';
import { jsonBody, pathParams, toIso, toIsoOrNull } from '../../lib/http';
import type { StoragePort } from '../../lib/storage';
import { requireAuth } from '../../middleware/require-auth';
import {
  adminRoles,
  anyMemberRoles,
  requireCommunityRole,
} from '../../middleware/require-community-role';
import type { IncidentRow, PhotoRow } from './repository';
import { listIncidents, listPhotosByCommunity } from './repository';
import {
  getPhotoDownload,
  removeIncident,
  removePhoto,
  reportIncident,
  updateIncident,
  uploadPhoto,
} from './service';

const communityParams = z.object({ id: communityIdSchema });
const incidentParams = z.object({
  id: communityIdSchema,
  incidentId: z.string().min(1),
});
const photoParams = z.object({
  id: communityIdSchema,
  incidentId: z.string().min(1),
  photoId: z.string().min(1),
});

const serializePhoto = (row: PhotoRow) =>
  incidentPhotoSchema.parse({
    id: row.id,
    contentType: row.contentType,
    sizeBytes: row.sizeBytes,
    uploadedByName: row.uploadedByName,
    createdAt: toIso(row.createdAt),
  });

const serialize = (row: IncidentRow, photos: ReturnType<typeof serializePhoto>[]) =>
  incidentSchema.parse({
    ...row,
    resolvedAt: toIsoOrNull(row.resolvedAt),
    createdAt: toIso(row.createdAt),
    photos,
  });

/**
 * Incidencias: cualquier miembro las reporta (y adjunta fotos en el
 * almacén privado); solo owner/admin las gestionan.
 */
export function incidentRoutes(
  db: Database,
  auth: Auth,
  storage: StoragePort,
): Hono<AppEnv> {
  const routes = new Hono<AppEnv>();

  routes.get(
    '/:id/incidents',
    requireAuth(auth),
    requireCommunityRole(db, anyMemberRoles),
    async (c) => {
      const { id } = pathParams(communityParams, c.req.param());
      const [rows, photoRows] = await Promise.all([
        listIncidents(db, id),
        listPhotosByCommunity(db, id),
      ]);
      // Agrupa las fotos por incidencia.
      const grouped = new Map<string, ReturnType<typeof serializePhoto>[]>();
      for (const photo of photoRows) {
        const list = grouped.get(photo.incidentId) ?? [];
        list.push(serializePhoto(photo));
        grouped.set(photo.incidentId, list);
      }

      return c.json(
        z
          .array(incidentSchema)
          .parse(rows.map((row) => serialize(row, grouped.get(row.id) ?? []))),
      );
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
      return c.json(serialize(incident, []), 201);
    },
  );

  routes.patch(
    '/:id/incidents/:incidentId',
    requireAuth(auth),
    requireCommunityRole(db, adminRoles),
    async (c) => {
      const { id, incidentId } = pathParams(incidentParams, c.req.param());
      const input = await jsonBody(updateIncidentInputSchema, c);
      const user = c.get('user');
      await updateIncident(db, { id: user.id, name: user.name }, id, incidentId, input);
      return c.json({ ok: true });
    },
  );

  routes.delete(
    '/:id/incidents/:incidentId',
    requireAuth(auth),
    requireCommunityRole(db, adminRoles),
    async (c) => {
      const { id, incidentId } = pathParams(incidentParams, c.req.param());
      const user = c.get('user');
      await removeIncident(db, { id: user.id, name: user.name }, id, incidentId);
      return c.json({ ok: true });
    },
  );

  /** Adjunta una fotografía (cualquier miembro; 3 MB máx.). */
  routes.post(
    '/:id/incidents/:incidentId/photos',
    requireAuth(auth),
    requireCommunityRole(db, anyMemberRoles),
    async (c) => {
      const { id, incidentId } = pathParams(incidentParams, c.req.param());
      const input = await jsonBody(uploadPhotoInputSchema, c);
      const user = c.get('user');
      const photo = await uploadPhoto(
        db,
        storage,
        { id: user.id, name: user.name },
        id,
        incidentId,
        input,
      );
      return c.json(serializePhoto(photo), 201);
    },
  );

  /** URL firmada (10 min) para ver una fotografía. */
  routes.get(
    '/:id/incidents/:incidentId/photos/:photoId/download',
    requireAuth(auth),
    requireCommunityRole(db, anyMemberRoles),
    async (c) => {
      const { id, incidentId, photoId } = pathParams(photoParams, c.req.param());
      const download = await getPhotoDownload(db, storage, id, incidentId, photoId);
      return c.json(signedDownloadSchema.parse(download));
    },
  );

  routes.delete(
    '/:id/incidents/:incidentId/photos/:photoId',
    requireAuth(auth),
    requireCommunityRole(db, anyMemberRoles),
    async (c) => {
      const { id, incidentId, photoId } = pathParams(photoParams, c.req.param());
      await removePhoto(
        db,
        storage,
        { id: c.get('user').id, role: c.get('membership').role },
        id,
        incidentId,
        photoId,
      );
      return c.json({ ok: true });
    },
  );

  return routes;
}
