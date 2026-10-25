import {
  assetSchema,
  communityIdSchema,
  createAssetInputSchema,
  updateAssetInputSchema,
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
import { listAssets } from './repository';
import { addAsset, editAsset, removeAsset } from './service';

const communityParams = z.object({ id: communityIdSchema });
const assetParams = z.object({
  id: communityIdSchema,
  assetId: z.string().min(1),
});

const serialize = (row: Awaited<ReturnType<typeof listAssets>>[number]) =>
  assetSchema.parse({ ...row, createdAt: toIso(row.createdAt) });

/** Inventario de elementos comunes: lectura miembros, gestión admin. */
export function assetRoutes(db: Database, auth: Auth): Hono<AppEnv> {
  const routes = new Hono<AppEnv>();

  routes.get(
    '/:id/assets',
    requireAuth(auth),
    requireCommunityRole(db, anyMemberRoles),
    async (c) => {
      const { id } = pathParams(communityParams, c.req.param());
      const rows = await listAssets(db, id);
      return c.json(z.array(assetSchema).parse(rows.map(serialize)));
    },
  );

  routes.post(
    '/:id/assets',
    requireAuth(auth),
    requireCommunityRole(db, adminRoles),
    async (c) => {
      const { id } = pathParams(communityParams, c.req.param());
      const input = await jsonBody(createAssetInputSchema, c);
      const asset = await addAsset(db, c.get('user'), id, input);
      return c.json(serialize(asset), 201);
    },
  );

  routes.patch(
    '/:id/assets/:assetId',
    requireAuth(auth),
    requireCommunityRole(db, adminRoles),
    async (c) => {
      const { id, assetId } = pathParams(assetParams, c.req.param());
      const input = await jsonBody(updateAssetInputSchema, c);
      await editAsset(db, c.get('user'), id, assetId, input);
      return c.json({ ok: true });
    },
  );

  routes.delete(
    '/:id/assets/:assetId',
    requireAuth(auth),
    requireCommunityRole(db, adminRoles),
    async (c) => {
      const { id, assetId } = pathParams(assetParams, c.req.param());
      await removeAsset(db, c.get('user'), id, assetId);
      return c.json({ ok: true });
    },
  );

  return routes;
}
