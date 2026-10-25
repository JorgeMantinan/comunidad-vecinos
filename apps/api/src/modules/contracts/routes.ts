import {
  communityIdSchema,
  contractSchema,
  createContractInputSchema,
  updateContractInputSchema,
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
import { listContracts } from './repository';
import { addContract, editContract, removeContract } from './service';

const communityParams = z.object({ id: communityIdSchema });
const contractParams = z.object({
  id: communityIdSchema,
  contractId: z.string().min(1),
});

const serialize = (row: Awaited<ReturnType<typeof listContracts>>[number]) =>
  contractSchema.parse({ ...row, createdAt: toIso(row.createdAt) });

/** Contratos de mantenimiento con vigilancia de renovaciones. */
export function contractRoutes(db: Database, auth: Auth): Hono<AppEnv> {
  const routes = new Hono<AppEnv>();

  routes.get(
    '/:id/contracts',
    requireAuth(auth),
    requireCommunityRole(db, anyMemberRoles),
    async (c) => {
      const { id } = pathParams(communityParams, c.req.param());
      const rows = await listContracts(db, id);
      return c.json(z.array(contractSchema).parse(rows.map(serialize)));
    },
  );

  routes.post(
    '/:id/contracts',
    requireAuth(auth),
    requireCommunityRole(db, adminRoles),
    async (c) => {
      const { id } = pathParams(communityParams, c.req.param());
      const input = await jsonBody(createContractInputSchema, c);
      const contract = await addContract(db, c.get('user'), id, input);
      return c.json(serialize(contract), 201);
    },
  );

  routes.patch(
    '/:id/contracts/:contractId',
    requireAuth(auth),
    requireCommunityRole(db, adminRoles),
    async (c) => {
      const { id, contractId } = pathParams(contractParams, c.req.param());
      const input = await jsonBody(updateContractInputSchema, c);
      await editContract(db, c.get('user'), id, contractId, input);
      return c.json({ ok: true });
    },
  );

  routes.delete(
    '/:id/contracts/:contractId',
    requireAuth(auth),
    requireCommunityRole(db, adminRoles),
    async (c) => {
      const { id, contractId } = pathParams(contractParams, c.req.param());
      await removeContract(db, c.get('user'), id, contractId);
      return c.json({ ok: true });
    },
  );

  return routes;
}
