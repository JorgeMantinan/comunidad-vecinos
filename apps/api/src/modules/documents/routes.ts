import {
  communityIdSchema,
  documentSchema,
  signedDownloadSchema,
  uploadDocumentInputSchema,
} from '@comunidad/shared';
import { z } from 'zod';
import { Hono } from 'hono';
import type { Database } from '../../db/client';
import type { Auth } from '../../lib/auth';
import type { AppEnv } from '../../lib/context';
import { jsonBody, pathParams, toIso } from '../../lib/http';
import type { StoragePort } from '../../lib/storage';
import { requireAuth } from '../../middleware/require-auth';
import {
  adminRoles,
  financeReaderRoles,
  requireCommunityRole,
} from '../../middleware/require-community-role';
import { listDocuments } from './repository';
import { getDocumentDownload, removeDocument, uploadDocument } from './service';

const communityParams = z.object({ id: communityIdSchema });
const documentParams = z.object({
  id: communityIdSchema,
  documentId: z.string().min(1),
});

const serialize = (row: Awaited<ReturnType<typeof listDocuments>>[number]) =>
  documentSchema.parse({ ...row, createdAt: toIso(row.createdAt) });

/**
 * Documentación privada: metadatos en BD, binarios en almacén privado
 * y descargas solo con URL firmada de corta duración.
 */
export function documentRoutes(
  db: Database,
  auth: Auth,
  storage: StoragePort,
): Hono<AppEnv> {
  const routes = new Hono<AppEnv>();

  routes.get(
    '/:id/documents',
    requireAuth(auth),
    requireCommunityRole(db, financeReaderRoles),
    async (c) => {
      const { id } = pathParams(communityParams, c.req.param());
      const rows = await listDocuments(db, id);
      return c.json(z.array(documentSchema).parse(rows.map(serialize)));
    },
  );

  routes.post(
    '/:id/documents',
    requireAuth(auth),
    requireCommunityRole(db, adminRoles),
    async (c) => {
      const { id } = pathParams(communityParams, c.req.param());
      const input = await jsonBody(uploadDocumentInputSchema, c);
      const user = c.get('user');
      const document = await uploadDocument(
        db,
        storage,
        { id: user.id, name: user.name },
        id,
        input,
      );
      return c.json(serialize(document), 201);
    },
  );

  /** Entrega una URL firmada (10 min); el almacén es privado. */
  routes.get(
    '/:id/documents/:documentId/download',
    requireAuth(auth),
    requireCommunityRole(db, financeReaderRoles),
    async (c) => {
      const { id, documentId } = pathParams(documentParams, c.req.param());
      const download = await getDocumentDownload(db, storage, id, documentId);
      return c.json(signedDownloadSchema.parse(download));
    },
  );

  routes.delete(
    '/:id/documents/:documentId',
    requireAuth(auth),
    requireCommunityRole(db, adminRoles),
    async (c) => {
      const { id, documentId } = pathParams(documentParams, c.req.param());
      const user = c.get('user');
      await removeDocument(
        db,
        storage,
        { id: user.id, name: user.name },
        id,
        documentId,
      );
      return c.json({ ok: true });
    },
  );

  return routes;
}
