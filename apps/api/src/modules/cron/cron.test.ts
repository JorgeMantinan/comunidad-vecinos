import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { auditEvents, invitations } from '../../db/schema';
import { newId } from '../../lib/ids';
import type { TestContext, TestUser } from '../../test/test-context';
import { createCommunityAs, createTestContext } from '../../test/test-context';

const SECRET = 'secreto-de-cron-de-pruebas-1234';
const DAY = 86_400_000;

describe('Mantenimiento semanal (purga + copia)', () => {
  let ctx: TestContext;
  let owner: TestUser;
  let communityId: string;
  const previous = process.env.CRON_SECRET;

  beforeAll(async () => {
    process.env.CRON_SECRET = SECRET;
    ctx = await createTestContext();
    owner = await ctx.signUp({
      name: 'Elena Presidenta',
      email: 'presidente@ejemplo.local',
      password: 'Password123!',
    });
    communityId = await createCommunityAs(ctx, owner, 'Comunidad del cron');
  });

  afterAll(async () => {
    if (previous === undefined) {
      delete process.env.CRON_SECRET;
    } else {
      process.env.CRON_SECRET = previous;
    }
    await ctx.close();
  });

  it('rechaza las llamadas sin secreto o con un secreto distinto', async () => {
    expect((await ctx.request('/api/cron/maintenance')).status).toBe(401);
    expect(
      (
        await ctx.request('/api/cron/maintenance', {
          headers: { authorization: 'Bearer otro-secreto' },
        })
      ).status,
    ).toBe(401);
    // Misma longitud que el secreto real: sigue siendo 401.
    expect(
      (
        await ctx.request('/api/cron/maintenance', {
          headers: { authorization: `Bearer ${'x'.repeat(SECRET.length)}` },
        })
      ).status,
    ).toBe(401);
  });

  it('purga lo caducado, vuelca al almacén y rota las copias viejas', async () => {
    const expired = 'backups/backup-2026-01-01T00-00-00-000Z.json';
    const recent = 'backups/backup-2099-01-01T00-00-00-000Z.json';
    await ctx.storage.put(
      expired,
      Buffer.from('{"format":"vieja"}'),
      'application/json',
    );
    await ctx.storage.put(
      recent,
      Buffer.from('{"format":"reciente"}'),
      'application/json',
    );

    // Datos que la purga debe retirar (retención: 90 días y 24 meses).
    await ctx.db.insert(invitations).values({
      id: newId('iv'),
      communityId,
      email: 'caduca@ejemplo.local',
      role: 'member',
      tokenHash: 'a'.repeat(64),
      invitedById: owner.id,
      expiresAt: new Date(Date.now() - 400 * DAY),
    });
    await ctx.db.insert(invitations).values({
      id: newId('iv'),
      communityId,
      email: 'vigente@ejemplo.local',
      role: 'member',
      tokenHash: 'b'.repeat(64),
      invitedById: owner.id,
      expiresAt: new Date(Date.now() + 7 * DAY),
    });
    await ctx.db.insert(auditEvents).values({
      id: newId('ae'),
      communityId,
      action: 'test.viejo',
      createdAt: new Date(Date.now() - 25 * 30 * DAY),
    });

    const res = await ctx.request('/api/cron/maintenance', {
      headers: { authorization: `Bearer ${SECRET}` },
    });
    expect(res.status).toBe(200);

    const payload = (await res.json()) as {
      ok: boolean;
      key: string;
      bytes: number;
      pruned: string[];
      purge: { invitations: number; auditEvents: number };
    };
    expect(payload.ok).toBe(true);
    expect(payload.key).toMatch(/^backups\/backup-\d{4}-\d{2}-\d{2}T/);
    expect(payload.bytes).toBeGreaterThan(100);

    // Purga: se va lo caducado y se queda lo vigente.
    expect(payload.purge.invitations).toBe(1);
    expect(payload.purge.auditEvents).toBe(1);
    const emails = (
      await ctx.db.select({ email: invitations.email }).from(invitations)
    ).map((row) => row.email);
    expect(emails).not.toContain('caduca@ejemplo.local');
    expect(emails).toContain('vigente@ejemplo.local');
    const actions = (
      await ctx.db.select({ action: auditEvents.action }).from(auditEvents)
    ).map((row) => row.action);
    expect(actions).not.toContain('test.viejo');
    expect(actions).toContain('community.created');

    // Copias: la nueva existe, la caducada se borró y la reciente no.
    expect(ctx.storage.objects.has(payload.key)).toBe(true);
    expect(ctx.storage.objects.has(expired)).toBe(false);
    expect(ctx.storage.objects.has(recent)).toBe(true);
    expect(payload.pruned).toContain(expired);

    // El volcado es restaurable: mismo formato que el CLI.
    const stored = ctx.storage.objects.get(payload.key)?.body.toString('utf8') ?? '';
    expect(stored).toContain('comunidad-vecinos/backup-v1');
    expect(stored).toContain('"tables"');
  });

  it('es idempotente: una segunda pasada no vuelve a purgar nada', async () => {
    const res = await ctx.request('/api/cron/maintenance', {
      headers: { authorization: `Bearer ${SECRET}` },
    });
    const payload = (await res.json()) as {
      purge: { invitations: number; auditEvents: number };
    };
    expect(payload.purge).toEqual({ invitations: 0, auditEvents: 0 });
    const [rows] = await ctx.db
      .select({ id: invitations.id })
      .from(invitations)
      .where(eq(invitations.email, 'vigente@ejemplo.local'));
    expect(rows).toBeDefined();
  });
});
