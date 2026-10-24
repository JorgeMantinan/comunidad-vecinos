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
