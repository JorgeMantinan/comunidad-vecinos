import { healthStatusSchema } from '@comunidad/shared';
import { Hono } from 'hono';

/** Heartbeat de la API. No requiere autenticación. */
export function healthRoutes(): Hono {
  const routes = new Hono();

  routes.get('/', (c) =>
    c.json(
      healthStatusSchema.parse({
        status: 'ok',
        version: '0.0.0',
        timestamp: new Date().toISOString(),
      }),
    ),
  );

  return routes;
}
