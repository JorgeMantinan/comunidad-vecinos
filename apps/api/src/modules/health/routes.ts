import { healthStatusSchema } from '@comunidad/shared';
import { Hono } from 'hono';

export interface HealthOptions {
  /** Acceso con Google habilitado (según las credenciales configuradas). */
  login: { google: boolean };
}

/** Heartbeat de la API. No requiere autenticación. */
export function healthRoutes(options: HealthOptions): Hono {
  const routes = new Hono();

  routes.get('/', (c) =>
    c.json(
      healthStatusSchema.parse({
        status: 'ok',
        version: '0.0.0',
        timestamp: new Date().toISOString(),
        login: options.login,
      }),
    ),
  );

  return routes;
}
