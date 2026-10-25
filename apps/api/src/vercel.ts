import { handle } from '@hono/vercel';
import { createApp } from './app';
import { loadConfig } from './config';
import { createDatabase } from './db/client';
import { createAuth } from './lib/auth';
import { createBlobStorage } from './lib/storage';

/**
 * Entrada serverless de Vercel. `tsup` la empaqueta como ESM en
 * `api/index.mjs` (ver `tsup.config.ts`): los imports relativos quedan
 * resueltos dentro del bundle y las dependencias ESM se importan de
 * forma nativa. `vercel.json` reescribe todas las rutas hacia esta
 * función.
 */
const config = loadConfig();
if (!config.databaseUrl) {
  throw new Error(
    'DATABASE_URL es obligatorio en Vercel: configúralo en las variables de entorno del proyecto.',
  );
}

const db = createDatabase(config.databaseUrl);
const auth = createAuth(db, {
  secret: config.authSecret,
  trustedOrigins: config.corsOrigins,
  nodeEnv: config.nodeEnv,
});
const app = createApp({ db, auth, config, storage: createBlobStorage() });

/**
 * El runtime de Node de Vercel detecta los manejadores web por el
 * export `fetch`. Un export `default` se interpreta como firma
 * `(req, res) => void` y su respuesta se ignora (cuelgue), por lo que
 * solo se exporta `fetch`.
 */
export const fetch = handle(app);
