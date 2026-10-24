import type { MiddlewareHandler } from 'hono';
import type { Auth } from '../lib/auth';
import type { AppEnv } from '../lib/context';

/**
 * Exige una sesión válida. Coloca `user` y `session` en el contexto.
 * Responde 401 sin sesión; no distingue entre inválido y caducado.
 */
export function requireAuth(auth: Auth): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) {
      return c.json({ code: 'unauthorized', message: 'No autenticado' }, 401);
    }
    c.set('user', session.user);
    c.set('session', session.session);
    await next();
  };
}
