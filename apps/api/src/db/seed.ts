import { hashPassword } from 'better-auth/crypto';
import type { CommunityRole } from '@comunidad/shared';
import { eq } from 'drizzle-orm';
import { loadConfig } from '../config';
import { newId } from '../lib/ids';
import type { Database } from './client';
import { createDatabase } from './client';
import { createLocalDatabase } from './local';
import { runMigrations } from './migrate';
import { account, communities, communityMemberships, user } from './schema';

/**
 * Datos ficticios para desarrollo. Jamás usa datos reales de vecinos.
 * Credenciales: el email indicado y la contraseña `Vecino1234!`.
 */
const SEED_PASSWORD = 'Vecino1234!';

const seedUsers = [
  { key: 'presidente', name: 'Elena Presidenta', email: 'presidente@ejemplo.local' },
  { key: 'vecino', name: 'Vicente Vecino', email: 'vecino@ejemplo.local' },
  { key: 'administrador', name: 'Ana Administradora', email: 'admin@ejemplo.local' },
] as const;

interface SeedUser {
  id: string;
  email: string;
}

async function upsertUser(
  db: Database,
  input: { name: string; email: string },
): Promise<SeedUser> {
  const [existing] = await db
    .select({ id: user.id, email: user.email })
    .from(user)
    .where(eq(user.email, input.email))
    .limit(1);
  if (existing) {
    return existing;
  }

  const [inserted] = await db
    .insert(user)
    .values({
      id: newId('usr'),
      name: input.name,
      email: input.email,
      emailVerified: true,
    })
    .returning({ id: user.id, email: user.email });
  if (!inserted) {
    throw new Error(`No se pudo crear el usuario ${input.email}`);
  }
  await db.insert(account).values({
    id: newId('acc'),
    accountId: inserted.id,
    providerId: 'credential',
    userId: inserted.id,
    password: await hashPassword(SEED_PASSWORD),
  });
  return inserted;
}

async function upsertMembership(
  db: Database,
  input: { communityId: string; userId: string; role: CommunityRole },
): Promise<void> {
  await db
    .insert(communityMemberships)
    .values({ id: newId('mem'), ...input })
    .onConflictDoNothing();
}

const main = async () => {
  const config = loadConfig();
  const connection = config.databaseUrl
    ? { db: createDatabase(config.databaseUrl), close: async () => {} }
    : await createLocalDatabase();

  try {
    await runMigrations(connection.db);
    const db = connection.db;

    const users: Record<(typeof seedUsers)[number]['key'], SeedUser> = {} as never;
    for (const seedUser of seedUsers) {
      users[seedUser.key] = await upsertUser(db, seedUser);
    }

    const communityValues = [
      { name: 'Comunidad Calle Mayor 12', address: 'Calle Mayor 12, Madrid' },
      { name: 'Urbanización El Pinar', address: 'Camino del Pinar 4, Sevilla' },
    ];

    const createdCommunities: string[] = [];
    for (const community of communityValues) {
      const [inserted] = await db
        .insert(communities)
        .values({ id: newId('cm'), ...community })
        .returning({ id: communities.id });
      if (!inserted) {
        throw new Error('No se pudo crear la comunidad de ejemplo');
      }
      createdCommunities.push(inserted.id);
    }

    const [first, second] = createdCommunities;
    if (!first || !second) {
      throw new Error('Faltan comunidades de ejemplo');
    }

    await upsertMembership(db, {
      communityId: first,
      userId: users.presidente.id,
      role: 'owner',
    });
    await upsertMembership(db, {
      communityId: first,
      userId: users.vecino.id,
      role: 'member',
    });
    await upsertMembership(db, {
      communityId: first,
      userId: users.administrador.id,
      role: 'admin',
    });
    await upsertMembership(db, {
      communityId: second,
      userId: users.vecino.id,
      role: 'owner',
    });

    console.info('Datos ficticios creados.');
    console.info(`Contraseña de todos los usuarios: ${SEED_PASSWORD}`);
    for (const seedUser of seedUsers) {
      console.info(` - ${seedUser.email} (${seedUser.key})`);
    }
  } finally {
    await connection.close();
  }
};

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
