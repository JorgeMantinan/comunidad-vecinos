import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import type { Database } from '../db/client';
import * as schema from '../db/schema';

export interface AuthOptions {
  secret: string;
  /** Orígenes (frontend) permitidos para operaciones de autenticación. */
  trustedOrigins?: string[];
  baseURL?: string;
  /** Entorno activo; por defecto, `NODE_ENV`. */
  nodeEnv?: string;
  /** Credenciales de Google: si faltan, no se ofrece el acceso con Google. */
  google?: { clientId: string; clientSecret: string };
}

/** Configuración que Better Auth necesita (la comparten local y Vercel). */
export interface AuthEnvironment {
  authSecret: string;
  corsOrigins: string[];
  nodeEnv: string;
  authBaseUrl: string | undefined;
  google: { clientId: string; clientSecret: string } | undefined;
}

/**
 * Fábrica única de la instancia de Better Auth: la usan el servidor
 * local (`server.ts`) y la función de Vercel (`vercel.ts`) para que no
 * haya divergencias entre ambos. Hasta esta refactorización el acceso
 * con Google solo estaba en uno de los dos y en producción respondía
 * `PROVIDER_NOT_FOUND`.
 */
export function createAuthFromEnvironment(db: Database, env: AuthEnvironment): Auth {
  return createAuth(db, {
    secret: env.authSecret,
    trustedOrigins: env.corsOrigins,
    nodeEnv: env.nodeEnv,
    baseURL: env.authBaseUrl,
    google: env.google,
  });
}

/** Better Auth como proveedor de identidad y sesiones. */
export function createAuth(db: Database, options: AuthOptions) {
  // En producción la web y la API viven en subdominios distintos de
  // Vercel: las cookies de sesión deben ser SameSite=None + Secure.
  const isProduction = (options.nodeEnv ?? process.env.NODE_ENV) === 'production';

  return betterAuth({
    secret: options.secret,
    baseURL: options.baseURL,
    trustedOrigins: options.trustedOrigins ?? [],
    database: drizzleAdapter(db, { provider: 'pg', schema }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      minPasswordLength: 8,
    },
    // Acceso con Google (solo con credenciales). Better Auth enlaza la
    // cuenta de Google con la existente cuando coincide el correo, así
    // quien ya tenía contraseña puede entrar con Google sin duplicarse.
    ...(options.google
      ? {
          socialProviders: {
            google: {
              clientId: options.google.clientId,
              clientSecret: options.google.clientSecret,
            },
          },
          account: {
            accountLinking: {
              enabled: true,
              trustedProviders: ['google'],
            },
          },
        }
      : {}),
    // Límite explícito de intentos de autenticación (fuerza bruta).
    // Solo activo en producción: los tests reciben tráfico sintético.
    rateLimit: {
      enabled: process.env.NODE_ENV === 'production',
      window: 60,
      max: 100,
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
    },
    advanced: {
      useSecureCookies: isProduction,
      cookies: {
        session_token: {
          attributes: {
            sameSite: isProduction ? 'none' : 'lax',
            secure: isProduction,
          },
        },
      },
    },
    telemetry: { enabled: false },
  });
}

export type Auth = ReturnType<typeof createAuth>;
