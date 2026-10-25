import {
  deleteAccountInputSchema,
  deleteAccountResultSchema,
  personalExportSchema,
} from '@comunidad/shared';
import { Hono } from 'hono';
import type { Database } from '../../db/client';
import type { Auth } from '../../lib/auth';
import type { AppEnv } from '../../lib/context';
import { jsonBody } from '../../lib/http';
import { unauthorized } from '../../lib/errors';
import type { StoragePort } from '../../lib/storage';
import { requireAuth } from '../../middleware/require-auth';
import {
  buildPersonalExport,
  deleteAccountData,
  verifyAccountPassword,
} from './service';

/**
 * Cuenta personal: exportación de los propios datos y baja de la cuenta.
 * No hay parámetros de comunidad: todo se resuelve con el usuario de la
 * sesión, de modo que es imposible tocar datos ajenos.
 */
export function accountRoutes(
  db: Database,
  auth: Auth,
  storage: StoragePort,
): Hono<AppEnv> {
  const routes = new Hono<AppEnv>();

  routes.get('/export', requireAuth(auth), async (c) => {
    const payload = await buildPersonalExport(db, c.get('user').id);
    return c.json(personalExportSchema.parse(payload));
  });

  routes.delete('/', requireAuth(auth), async (c) => {
    const input = await jsonBody(deleteAccountInputSchema, c);
    const valid = await verifyAccountPassword(db, c.get('user').id, input.password);
    if (!valid) {
      throw unauthorized('La contraseña no es correcta');
    }
    const result = await deleteAccountData(db, storage, c.get('user').id);
    return c.json(deleteAccountResultSchema.parse(result));
  });

  return routes;
}
