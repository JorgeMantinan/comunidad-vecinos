import { handle } from '@hono/vercel';
import { createApp } from '../src/app';
import { loadConfig } from '../src/config';
import { createDatabase } from '../src/db/client';
import { createAuth } from '../src/lib/auth';

/**
 * Entrada serverless de Vercel. `vercel.json` reescribe todas las
 * rutas hacia esta función, que sirve la app Hono completa.
 */
const config = loadConfig();
if (!config.databaseUrl) {
  throw new Error(
    'DATABASE_URL es obligatorio en Vercel: configúralo en la variables de entorno del proyecto.',
  );
}

const db = createDatabase(config.databaseUrl);
const auth = createAuth(db, {
  secret: config.authSecret,
  trustedOrigins: config.corsOrigins,
  nodeEnv: config.nodeEnv,
});
const app = createApp({ db, auth, config });

export default handle(app);
