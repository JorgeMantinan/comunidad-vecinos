import { adminOverviewSchema } from '@comunidad/shared';
import { Hono } from 'hono';
import type { Database } from '../../db/client';
import type { Auth } from '../../lib/auth';
import type { AppEnv } from '../../lib/context';
import { requireAuth } from '../../middleware/require-auth';
import { buildAdminOverview } from './service';

/**
 * Panel de administración de fincas: métricas por comunidad donde el
 * usuario es `owner`/`admin`. Solo consulta comunidades autorizadas.
 */
export function adminRoutes(db: Database, auth: Auth): Hono<AppEnv> {
  const routes = new Hono<AppEnv>();

  routes.get('/overview', requireAuth(auth), async (c) => {
    const rows = await buildAdminOverview(db, c.get('user').id);
    return c.json(adminOverviewSchema.parse(rows));
  });

  return routes;
}
