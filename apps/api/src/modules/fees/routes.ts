import {
  communityIdSchema,
  createFeeTariffInputSchema,
  feeChargeSchema,
  feeTariffSchema,
  generateFeeChargesInputSchema,
  generateFeeChargesResultSchema,
  periodSchema,
  updateFeeChargeInputSchema,
  updateFeeTariffInputSchema,
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
  financeReaderRoles,
  requireCommunityRole,
} from '../../middleware/require-community-role';
import type { FeeChargeRow, FeeTariffRow } from './repository';
import { listCharges, listTariffs } from './repository';
import {
  createFeeTariff,
  editFeeTariff,
  generateFeeCharges,
  removeFeeTariff,
  setFeeChargeStatus,
} from './service';

const communityParams = z.object({ id: communityIdSchema });
const tariffParams = communityParams.extend({ tariffId: z.string().min(1) });
const chargeParams = communityParams.extend({ chargeId: z.string().min(1) });
const periodQuery = z.object({ period: periodSchema.optional() });

const serializeTariff = (row: FeeTariffRow) =>
  feeTariffSchema.parse({ ...row, createdAt: toIso(row.createdAt) });

const serializeCharge = (row: FeeChargeRow) => feeChargeSchema.parse(row);

/**
 * Cuotas ordinarias y tasas por anexo (garaje, trastero…). Ver
 * `docs/data-model.md`. La visualización es de lector económico; el
 * alta de tarifas, la generación de un periodo y el cobro son de
 * `owner`/`admin`.
 */
export function feeRoutes(db: Database, auth: Auth): Hono<AppEnv> {
  const routes = new Hono<AppEnv>();

  routes.get(
    '/:id/fee-tariffs',
    requireAuth(auth),
    requireCommunityRole(db, financeReaderRoles),
    async (c) => {
      const { id } = pathParams(communityParams, c.req.param());
      const rows = await listTariffs(db, id);
      return c.json(z.array(feeTariffSchema).parse(rows.map(serializeTariff)));
    },
  );

  routes.post(
    '/:id/fee-tariffs',
    requireAuth(auth),
    requireCommunityRole(db, adminRoles),
    async (c) => {
      const { id } = pathParams(communityParams, c.req.param());
      const input = await jsonBody(createFeeTariffInputSchema, c);
      const tariff = await createFeeTariff(db, c.get('user'), id, input);
      return c.json(serializeTariff(tariff), 201);
    },
  );

  routes.patch(
    '/:id/fee-tariffs/:tariffId',
    requireAuth(auth),
    requireCommunityRole(db, adminRoles),
    async (c) => {
      const { id, tariffId } = pathParams(tariffParams, c.req.param());
      const input = await jsonBody(updateFeeTariffInputSchema, c);
      await editFeeTariff(db, c.get('user'), id, tariffId, input);
      return c.json({ ok: true });
    },
  );

  routes.delete(
    '/:id/fee-tariffs/:tariffId',
    requireAuth(auth),
    requireCommunityRole(db, adminRoles),
    async (c) => {
      const { id, tariffId } = pathParams(tariffParams, c.req.param());
      await removeFeeTariff(db, c.get('user'), id, tariffId);
      return c.json({ ok: true });
    },
  );

  routes.get(
    '/:id/fee-charges',
    requireAuth(auth),
    requireCommunityRole(db, financeReaderRoles),
    async (c) => {
      const { id } = pathParams(communityParams, c.req.param());
      const { period } = periodQuery.parse({
        period: c.req.query('period') ?? undefined,
      });
      const rows = await listCharges(db, id, period);
      return c.json(z.array(feeChargeSchema).parse(rows.map(serializeCharge)));
    },
  );

  routes.post(
    '/:id/fee-charges/generate',
    requireAuth(auth),
    requireCommunityRole(db, adminRoles),
    async (c) => {
      const { id } = pathParams(communityParams, c.req.param());
      const input = await jsonBody(generateFeeChargesInputSchema, c);
      const result = await generateFeeCharges(db, c.get('user'), id, input);
      return c.json(generateFeeChargesResultSchema.parse(result));
    },
  );

  routes.patch(
    '/:id/fee-charges/:chargeId',
    requireAuth(auth),
    requireCommunityRole(db, adminRoles),
    async (c) => {
      const { id, chargeId } = pathParams(chargeParams, c.req.param());
      const input = await jsonBody(updateFeeChargeInputSchema, c);
      await setFeeChargeStatus(db, c.get('user'), id, chargeId, input);
      return c.json({ ok: true });
    },
  );

  return routes;
}
