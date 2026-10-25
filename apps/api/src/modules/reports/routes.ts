import {
  communityIdSchema,
  economyReportQuerySchema,
  economyReportSchema,
} from '@comunidad/shared';
import { z } from 'zod';
import { Hono } from 'hono';
import type { Database } from '../../db/client';
import type { Auth } from '../../lib/auth';
import type { AppEnv } from '../../lib/context';
import { pathParams } from '../../lib/http';
import { requireAuth } from '../../middleware/require-auth';
import {
  adminRoles,
  financeReaderRoles,
  requireCommunityRole,
} from '../../middleware/require-community-role';
import { buildEconomyCsv, buildEconomyReport, resolvePeriod } from './service';

const communityParams = z.object({ id: communityIdSchema });

const parseQuery = (raw: Record<string, string | undefined>) =>
  economyReportQuerySchema.parse({
    from: raw.from,
    to: raw.to,
  });

/**
 * Informes por comunidad y periodo: resumen JSON para lectores
 * económicos y CSV descargable (owner/admin).
 */
export function reportRoutes(db: Database, auth: Auth): Hono<AppEnv> {
  const routes = new Hono<AppEnv>();

  routes.get(
    '/:id/reports/economy',
    requireAuth(auth),
    requireCommunityRole(db, financeReaderRoles),
    async (c) => {
      const { id } = pathParams(communityParams, c.req.param());
      const query = parseQuery({
        from: c.req.query('from') ?? undefined,
        to: c.req.query('to') ?? undefined,
      });
      const { report } = await buildEconomyReport(db, id, query);
      return c.json(economyReportSchema.parse(report));
    },
  );

  routes.get(
    '/:id/reports/economy.csv',
    requireAuth(auth),
    requireCommunityRole(db, adminRoles),
    async (c) => {
      const { id } = pathParams(communityParams, c.req.param());
      const query = parseQuery({
        from: c.req.query('from') ?? undefined,
        to: c.req.query('to') ?? undefined,
      });
      const csv = await buildEconomyCsv(db, id, query);
      const period = resolvePeriod(query);
      return c.body(csv, 200, {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename="informe-economico-${period.from}-${period.to}.csv"`,
      });
    },
  );

  return routes;
}
