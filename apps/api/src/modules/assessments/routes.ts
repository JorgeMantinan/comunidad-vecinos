import {
  assessmentChargeSchema,
  assessmentDetailSchema,
  assessmentSchema,
  communityIdSchema,
  createAssessmentInputSchema,
  payChargeInputSchema,
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
import type { ChargeRow } from './repository';
import { listAssessments } from './repository';
import {
  createAssessment,
  getAssessmentDetail,
  markChargePaid,
  removeAssessment,
} from './service';

const communityParams = z.object({ id: communityIdSchema });
const assessmentParams = z.object({
  id: communityIdSchema,
  assessmentId: z.string().min(1),
});
const chargeParams = assessmentParams.extend({ chargeId: z.string().min(1) });

const serialize = (row: Awaited<ReturnType<typeof listAssessments>>[number]) =>
  assessmentSchema.parse({ ...row, createdAt: toIso(row.createdAt) });

const serializeCharge = (row: ChargeRow) => assessmentChargeSchema.parse(row);

/** Derramas: reparto del total entre unidades por coeficiente. */
export function assessmentRoutes(db: Database, auth: Auth): Hono<AppEnv> {
  const routes = new Hono<AppEnv>();

  routes.get(
    '/:id/assessments',
    requireAuth(auth),
    requireCommunityRole(db, financeReaderRoles),
    async (c) => {
      const { id } = pathParams(communityParams, c.req.param());
      const rows = await listAssessments(db, id);
      return c.json(z.array(assessmentSchema).parse(rows.map(serialize)));
    },
  );

  routes.get(
    '/:id/assessments/:assessmentId',
    requireAuth(auth),
    requireCommunityRole(db, financeReaderRoles),
    async (c) => {
      const { id, assessmentId } = pathParams(assessmentParams, c.req.param());
      const detail = await getAssessmentDetail(db, id, assessmentId);
      return c.json(
        assessmentDetailSchema.parse({
          ...serialize(detail.assessment),
          charges: detail.charges.map(serializeCharge),
        }),
      );
    },
  );

  routes.post(
    '/:id/assessments',
    requireAuth(auth),
    requireCommunityRole(db, adminRoles),
    async (c) => {
      const { id } = pathParams(communityParams, c.req.param());
      const input = await jsonBody(createAssessmentInputSchema, c);
      const detail = await createAssessment(db, c.get('user'), id, input);
      return c.json(
        assessmentDetailSchema.parse({
          ...serialize(detail.assessment),
          charges: detail.charges.map(serializeCharge),
        }),
        201,
      );
    },
  );

  routes.post(
    '/:id/assessments/:assessmentId/charges/:chargeId/pay',
    requireAuth(auth),
    requireCommunityRole(db, adminRoles),
    async (c) => {
      const { id, assessmentId, chargeId } = pathParams(chargeParams, c.req.param());
      const input = await jsonBody(payChargeInputSchema, c);
      await markChargePaid(db, c.get('user'), id, assessmentId, chargeId, input);
      return c.json({ ok: true });
    },
  );

  routes.delete(
    '/:id/assessments/:assessmentId',
    requireAuth(auth),
    requireCommunityRole(db, adminRoles),
    async (c) => {
      const { id, assessmentId } = pathParams(assessmentParams, c.req.param());
      await removeAssessment(db, c.get('user'), id, assessmentId);
      return c.json({ ok: true });
    },
  );

  return routes;
}
