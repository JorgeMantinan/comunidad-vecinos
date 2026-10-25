import {
  communityIdSchema,
  createTemplateInputSchema,
  documentSchema,
  documentTemplateSchema,
  generateDocumentInputSchema,
  updateTemplateInputSchema,
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
  requireCommunityRole,
} from '../../middleware/require-community-role';
import { listTemplates } from './repository';
import {
  addTemplate,
  editTemplate,
  generateDocumentFromTemplate,
  removeTemplate,
} from './service';

const communityParams = z.object({ id: communityIdSchema });
const templateParams = z.object({
  id: communityIdSchema,
  templateId: z.string().min(1),
});

const serialize = (row: Awaited<ReturnType<typeof listTemplates>>[number]) =>
  documentTemplateSchema.parse({
    ...row,
    createdAt: toIso(row.createdAt),
  });

/**
 * Plantillas de documentos (modelos de texto) y su generación como
 * documento en el almacén privado. Herramienta de la administración.
 */
export function templateRoutes(
  db: Database,
  auth: Auth,
  storage: StoragePort,
): Hono<AppEnv> {
  const routes = new Hono<AppEnv>();

  routes.get(
    '/:id/templates',
    requireAuth(auth),
    requireCommunityRole(db, adminRoles),
    async (c) => {
      const { id } = pathParams(communityParams, c.req.param());
      const rows = await listTemplates(db, id);
      return c.json(z.array(documentTemplateSchema).parse(rows.map(serialize)));
    },
  );

  routes.post(
    '/:id/templates',
    requireAuth(auth),
    requireCommunityRole(db, adminRoles),
    async (c) => {
      const { id } = pathParams(communityParams, c.req.param());
      const input = await jsonBody(createTemplateInputSchema, c);
      const user = c.get('user');
      const template = await addTemplate(
        db,
        { id: user.id, name: user.name },
        id,
        input,
      );
      return c.json(serialize(template), 201);
    },
  );

  routes.patch(
    '/:id/templates/:templateId',
    requireAuth(auth),
    requireCommunityRole(db, adminRoles),
    async (c) => {
      const { id, templateId } = pathParams(templateParams, c.req.param());
      const input = await jsonBody(updateTemplateInputSchema, c);
      const user = c.get('user');
      await editTemplate(db, { id: user.id, name: user.name }, id, templateId, input);
      return c.json({ ok: true });
    },
  );

  routes.delete(
    '/:id/templates/:templateId',
    requireAuth(auth),
    requireCommunityRole(db, adminRoles),
    async (c) => {
      const { id, templateId } = pathParams(templateParams, c.req.param());
      const user = c.get('user');
      await removeTemplate(db, { id: user.id, name: user.name }, id, templateId);
      return c.json({ ok: true });
    },
  );

  /** Genera un `.txt` en el almacén privado a partir de la plantilla. */
  routes.post(
    '/:id/templates/:templateId/generate',
    requireAuth(auth),
    requireCommunityRole(db, adminRoles),
    async (c) => {
      const { id, templateId } = pathParams(templateParams, c.req.param());
      const input = await jsonBody(generateDocumentInputSchema, c);
      const user = c.get('user');
      const document = await generateDocumentFromTemplate(
        db,
        storage,
        { id: user.id, name: user.name },
        id,
        templateId,
        input,
      );
      return c.json(
        documentSchema.parse({
          ...document,
          createdAt: toIso(document.createdAt),
        }),
        201,
      );
    },
  );

  return routes;
}
