import type { MiddlewareHandler } from 'hono';
import type { Auth } from '../lib/auth';
import type { AppEnv } from '../lib/context';

/**
 * Administración de plataforma: emails autorizados en la variable de
 * entorno `PLATFORM_ADMIN_EMAILS` (separados por coma). Este rol gestiona
 * los patrocinios (publicidad) fuera de las comunidades; nunca accede a
 * los datos de los vecinos desde aquí.
 */
export function isPlatformAdmin(email: string): boolean {
  const allowed = (process.env.PLATFORM_ADMIN_EMAILS ?? '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.toLowerCase());
}

export function requirePlatformAdmin(auth: Auth): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) {
      return c.json({ code: 'unauthorized', message: 'No autenticado' }, 401);
    }
    if (!isPlatformAdmin(session.user.email)) {
      return c.json(
        {
          code: 'forbidden',
          message: 'Requiere administración de la plataforma',
        },
        403,
      );
    }
    c.set('user', session.user);
    c.set('session', session.session);
    await next();
  };
}
