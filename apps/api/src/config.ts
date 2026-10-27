import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1).optional(),
  AUTH_SECRET: z.string().min(16).optional(),
  PORT: z.coerce.number().int().positive().default(3001),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  /** Acceso con Google (si falta, la app no muestra el botón). */
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
  /** URL pública de la app: Better Auth construye el callback OAuth con ella. */
  BETTER_AUTH_URL: z.url().optional(),
});

const DEV_SECRET = 'desarrollo-local-sin-secreto-real';

/**
 * Carga `.env` local si existe (Node >= 22). Las variables reales del
 * entorno (Vercel, CI) tienen prioridad sobre el archivo.
 */
function loadLocalEnvFile(): void {
  try {
    process.loadEnvFile('.env');
  } catch {
    // No hay .env local: se usan las variables de entorno del sistema.
  }
}

export interface AppConfig {
  nodeEnv: 'development' | 'test' | 'production';
  databaseUrl: string | undefined;
  authSecret: string;
  port: number;
  corsOrigins: string[];
  /** URL pública de la app: Better Auth construye el callback OAuth con ella. */
  authBaseUrl: string | undefined;
  /** Credenciales de Google; sin ellas la app no ofrece el acceso con Google. */
  google: { clientId: string; clientSecret: string } | undefined;
}

/**
 * Carga y valida la configuración de entorno. En producción exige
 * `AUTH_SECRET`; en desarrollo usa un secreto fijo y emite un aviso.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  if (env === process.env) {
    loadLocalEnvFile();
  }

  // Una variable vacía equivale a no definida: así `.env.example`
  // puede traer `GOOGLE_CLIENT_ID=` sin romper la configuración.
  const normalized = Object.fromEntries(
    Object.entries(env).filter(([, value]) => value !== ''),
  );
  const parsed = envSchema.safeParse(normalized);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Configuración inválida -> ${issues}`);
  }

  const data = parsed.data;
  let authSecret = data.AUTH_SECRET;
  if (!authSecret) {
    if (data.NODE_ENV === 'production') {
      throw new Error('AUTH_SECRET es obligatorio en producción');
    }
    console.warn('AVISO: AUTH_SECRET no definido; se usa un secreto de desarrollo.');
    authSecret = DEV_SECRET;
  }

  return {
    nodeEnv: data.NODE_ENV,
    databaseUrl: data.DATABASE_URL,
    authSecret,
    port: data.PORT,
    corsOrigins: data.CORS_ORIGIN.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    authBaseUrl: data.BETTER_AUTH_URL,
    google:
      data.GOOGLE_CLIENT_ID && data.GOOGLE_CLIENT_SECRET
        ? { clientId: data.GOOGLE_CLIENT_ID, clientSecret: data.GOOGLE_CLIENT_SECRET }
        : undefined,
  };
}
