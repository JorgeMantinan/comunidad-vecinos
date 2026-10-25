import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { createApp } from '../app';
import type { AppConfig } from '../config';
import type { Database } from '../db/client';
import * as schema from '../db/schema';
import { MIGRATIONS_FOLDER } from '../db/migrate';
import { createAuth } from '../lib/auth';
import { RecordingEmail } from '../lib/email';
import { InMemoryStorage } from '../lib/storage';

export interface TestUser {
  id: string;
  name: string;
  email: string;
  cookie: string;
}

export interface RequestOptions {
  method?: string;
  body?: unknown;
  cookie?: string;
  /** Cabeceras adicionales (p. ej. la autorización del cron). */
  headers?: Record<string, string>;
}

export interface TestContext {
  app: ReturnType<typeof createApp>;
  db: Database;
  storage: InMemoryStorage;
  email: RecordingEmail;
  request: (path: string, options?: RequestOptions) => Promise<Response>;
  signUp: (input: {
    name: string;
    email: string;
    password: string;
  }) => Promise<TestUser>;
  close: () => Promise<void>;
}

/** Contexto de prueba: PostgreSQL real (PGlite en memoria) trasladado por
 * socket y consumido con el mismo driver `postgres-js` de producción.
 * Se usa puerto efímero (0) para evitar colisiones entre archivos de
 * test que corren en paralelo. Las migraciones se aplican desde cero
 * en cada contexto.
 */
export async function createTestContext(): Promise<TestContext> {
  const pglite = new PGlite();
  await pglite.waitReady;

  const server = new PGLiteSocketServer({
    db: pglite,
    host: '127.0.0.1',
    port: 0,
  });
  await server.start();

  const client = postgres(`postgresql://${server.getServerConn()}/postgres`, {
    max: 1,
  });
  const db: Database = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });

  const config: AppConfig = {
    nodeEnv: 'test',
    databaseUrl: undefined,
    authSecret: 'secreto-de-pruebas-suficientemente-largo',
    port: 0,
    corsOrigins: ['http://localhost:5173'],
  };
  const auth = createAuth(db, {
    secret: config.authSecret,
    trustedOrigins: config.corsOrigins,
  });
  const storage = new InMemoryStorage();
  const email = new RecordingEmail();
  const app = createApp({ db, auth, config, storage, email });

  const request = async (
    path: string,
    options: RequestOptions = {},
  ): Promise<Response> => {
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      ...options.headers,
    };
    if (options.cookie) {
      headers['cookie'] = options.cookie;
    }
    return await app.request(path, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  };

  const signUp = async (input: {
    name: string;
    email: string;
    password: string;
  }): Promise<TestUser> => {
    const res = await request('/api/auth/sign-up/email', {
      method: 'POST',
      body: input,
    });
    if (!res.ok) {
      throw new Error(`Registro fallido (${res.status}): ${await res.text()}`);
    }
    const data = (await res.json()) as { token: string; user: { id: string } };
    const cookie = res.headers
      .getSetCookie()
      .map((setCookie) => setCookie.split(';')[0])
      .find((pair) => pair?.includes('session'));
    return {
      id: data.user.id,
      name: input.name,
      email: input.email,
      cookie: cookie ?? `better-auth.session_token=${data.token}`,
    };
  };

  return {
    app,
    db,
    storage,
    email,
    request,
    signUp,
    close: async () => {
      await client.end({ timeout: 1 });
      await server.stop();
    },
  };
}

/** Crea una comunidad y devuelve su id (como owner el creador). */
export async function createCommunityAs(
  ctx: TestContext,
  user: TestUser,
  name = 'Comunidad de prueba',
): Promise<string> {
  const res = await ctx.request('/api/communities', {
    method: 'POST',
    cookie: user.cookie,
    body: { name },
  });
  if (res.status !== 201) {
    throw new Error(`No se pudo crear la comunidad (${res.status})`);
  }
  const body = (await res.json()) as { id: string };
  return body.id;
}

/** Invita (con `inviter`) y acepta (`invitee`) para unirse con `role`. */
export async function joinCommunity(
  ctx: TestContext,
  communityId: string,
  inviter: TestUser,
  invitee: TestUser,
  role: 'admin' | 'member' | 'resident',
): Promise<void> {
  const inviteRes = await ctx.request(`/api/communities/${communityId}/invitations`, {
    method: 'POST',
    cookie: inviter.cookie,
    body: { email: invitee.email, role },
  });
  if (inviteRes.status !== 201) {
    throw new Error(`Invitación fallida (${inviteRes.status})`);
  }
  const { token } = (await inviteRes.json()) as { token: string };
  const acceptRes = await ctx.request('/api/invitations/accept', {
    method: 'POST',
    cookie: invitee.cookie,
    body: { token },
  });
  if (acceptRes.status !== 200) {
    throw new Error(`Aceptación fallida (${acceptRes.status})`);
  }
}
