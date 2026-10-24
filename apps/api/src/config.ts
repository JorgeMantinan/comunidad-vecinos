import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1).optional(),
  AUTH_SECRET: z.string().min(16).optional(),
  PORT: z.coerce.number().int().positive().default(3001),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
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
}

/**
 * Carga y valida la configuración de entorno. En producción exige
 * `AUTH_SECRET`; en desarrollo usa un secreto fijo y emite un aviso.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  if (env === process.env) {
    loadLocalEnvFile();
  }

  const parsed = envSchema.safeParse(env);
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
  };
}
