import { serve } from '@hono/node-server';
import { createApp } from './app';
import { loadConfig } from './config';
import { createDatabase } from './db/client';
import { createLocalDatabase } from './db/local';
import { createAuth } from './lib/auth';
import { createEmailSender } from './lib/email';
import { createBlobStorage } from './lib/storage';

const config = loadConfig();

// Sin DATABASE_URL se usa PGlite local (PostgreSQL embebido).
const connection = config.databaseUrl
  ? { db: createDatabase(config.databaseUrl), close: async () => {} }
  : await createLocalDatabase();

const auth = createAuth(connection.db, {
  secret: config.authSecret,
  trustedOrigins: config.corsOrigins,
  nodeEnv: config.nodeEnv,
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
