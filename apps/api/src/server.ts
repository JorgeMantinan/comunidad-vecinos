import { serve } from '@hono/node-server';
import { createApp } from './app';
import { loadConfig } from './config';
import { createDatabase } from './db/client';
import { createLocalDatabase, shouldUseLocalDatabase } from './db/local';
import { createAuth } from './lib/auth';
import { createEmailSender } from './lib/email';
import { createBlobStorage } from './lib/storage';

const config = loadConfig();

// LOCAL_DB_DIR aísla en PGlite local (E2E); sin DATABASE_URL también.
const remoteUrl = shouldUseLocalDatabase(config.databaseUrl)
  ? undefined
  : config.databaseUrl;
const connection = remoteUrl
  ? { db: createDatabase(remoteUrl), close: async () => {} }
  : await createLocalDatabase();

const auth = createAuth(connection.db, {
  secret: config.authSecret,
  trustedOrigins: config.corsOrigins,
  nodeEnv: config.nodeEnv,
  // La URL pública define el callback OAuth
  // (https://<app>/api/auth/callback/google) y el dominio de la cookie.
  baseURL: config.authBaseUrl,
  google: config.google,
});

const app = createApp({
  db: connection.db,
  auth,
  config,
  storage: createBlobStorage(),
  email: createEmailSender(),
});

const server = serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.info(`API escuchando en http://localhost:${info.port}`);
});

const shutdown = async () => {
  server.close();
  await connection.close();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
