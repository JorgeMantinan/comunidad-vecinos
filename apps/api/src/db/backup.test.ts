import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createBackup } from './backup';
import type { BackupFile } from './backup';
import { restoreBackup } from './restore';
import { communities, user } from './schema';
import type { TestContext, TestUser } from '../test/test-context';
import { createCommunityAs, createTestContext } from '../test/test-context';

describe('Copias de seguridad y restauración', () => {
  let ctx: TestContext;
  let owner: TestUser;
  let backup: Awaited<ReturnType<typeof createBackup>>;

  beforeAll(async () => {
    ctx = await createTestContext();
    owner = await ctx.signUp({
      name: 'Elena Presidenta',
      email: 'presidente@ejemplo.local',
      password: 'Password123!',
    });
    const communityId = await createCommunityAs(ctx, owner, 'Comunidad con datos');
    await ctx.request(`/api/communities/${communityId}/announcements`, {
      method: 'POST',
      cookie: owner.cookie,
      body: { title: 'Aviso de copia', body: 'Contenido del aviso.' },
    });
    await ctx.request(`/api/communities/${communityId}/invitations`, {
      method: 'POST',
      cookie: owner.cookie,
      body: { email: 'invitada@ejemplo.local', role: 'member' },
    });

    backup = await createBackup(ctx.db);
  });

  afterAll(async () => {
    await ctx.close();
  });

  it('vuelca todas las tablas con formato versionado', () => {
    expect(backup.format).toBe('comunidad-vecinos/backup-v1');
    expect(new Date(backup.exportedAt).toString()).not.toBe('Invalid Date');
    expect(Object.keys(backup.tables).length).toBeGreaterThanOrEqual(31);
    expect(backup.tables.communities).toHaveLength(1);
    expect(backup.tables.announcements).toHaveLength(1);
    expect((backup.tables.user as unknown[]).length).toBeGreaterThanOrEqual(1);
    expect((backup.tables.invitations as unknown[]).length).toBeGreaterThanOrEqual(1);
  });

  it('restaura sobre otra base: limpia lo previo y recupera los datos', async () => {
    const target = await createTestContext();
    try {
      // Datos previos en el destino que deben desaparecer.
      const sentinelOwner = await target.signUp({
        name: 'Sentinel',
        email: 'sentinel@ejemplo.local',
        password: 'Password123!',
      });
      await createCommunityAs(target, sentinelOwner, 'Comunidad Sentinel');
      expect(
        (await target.db.select().from(communities)).length,
      ).toBeGreaterThanOrEqual(1);

      const counts = await restoreBackup(target.db, backup);

      // Lo previo se ha limpiado y la copia está recargada.
      const restoredCommunities = await target.db.select().from(communities);
      expect(restoredCommunities).toHaveLength(1);
      expect(restoredCommunities[0]?.name).toBe('Comunidad con datos');

      const restoredUsers = await target.db.select().from(user);
      expect(restoredUsers.map((row) => row.email)).toEqual([
        'presidente@ejemplo.local',
      ]);

      // La sesión restaurada (de la copia) funciona en el destino…
      const restoredList = await target.request('/api/communities', {
        cookie: owner.cookie,
      });
      expect(restoredList.status).toBe(200);
      expect((await restoredList.json()) as unknown[]).toHaveLength(1);

      // …y la sesión previa del destino quedó sustituida.
      const sentinelList = await target.request('/api/communities', {
        cookie: sentinelOwner.cookie,
      });
      expect(sentinelList.status).toBe(401);

      expect(counts.communities).toBe(1);
      expect(counts.user).toBe(1);
    } finally {
      await target.close();
    }
  });

  it('rechaza formatos de copia desconocidos', async () => {
    const target = await createTestContext();
    try {
      await expect(
        restoreBackup(target.db, {
          format: 'otro-formato',
          exportedAt: new Date().toISOString(),
          tables: {},
          // Entrada controlada: format inválido a propósito.
        } as unknown as BackupFile),
      ).rejects.toThrow(/Formato de copia no reconocido/);
    } finally {
      await target.close();
    }
  });
});
