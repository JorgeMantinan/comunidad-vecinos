import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { TestContext } from '../../test/test-context';
import { createTestContext } from '../../test/test-context';

const SECRET = 'secreto-de-cron-de-pruebas-1234';

describe('Cron de copias de seguridad', () => {
  let ctx: TestContext;
  const previous = process.env.CRON_SECRET;

  beforeAll(async () => {
    process.env.CRON_SECRET = SECRET;
    ctx = await createTestContext();
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
    expect((await ctx.request('/api/cron/backup')).status).toBe(401);
    expect(
      (
        await ctx.request('/api/cron/backup', {
          headers: { authorization: 'Bearer otro-secreto' },
        })
      ).status,
    ).toBe(401);
    // Mismo longitud que el secreto real: sigue siendo 401.
    expect(
      (
        await ctx.request('/api/cron/backup', {
          headers: { authorization: `Bearer ${'x'.repeat(SECRET.length)}` },
        })
      ).status,
    ).toBe(401);
  });

  it('vuelca la base al almacén y rota las copias caducadas', async () => {
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

    const res = await ctx.request('/api/cron/backup', {
      headers: { authorization: `Bearer ${SECRET}` },
    });
    expect(res.status).toBe(200);

    const payload = (await res.json()) as {
      ok: boolean;
      key: string;
      bytes: number;
      rows: number;
      pruned: string[];
    };
    expect(payload.ok).toBe(true);
    expect(payload.key).toMatch(/^backups\/backup-\d{4}-\d{2}-\d{2}T/);
    expect(payload.bytes).toBeGreaterThan(100);
    expect(typeof payload.rows).toBe('number');

    // La copia nueva existe, la caducada se borró y la reciente no.
    expect(ctx.storage.objects.has(payload.key)).toBe(true);
    expect(ctx.storage.objects.has(expired)).toBe(false);
    expect(ctx.storage.objects.has(recent)).toBe(true);
    expect(payload.pruned).toContain(expired);

    // El volcado es restaurable: mismo formato que el CLI.
    const stored = ctx.storage.objects.get(payload.key)?.body.toString('utf8') ?? '';
    expect(stored).toContain('comunidad-vecinos/backup-v1');
    expect(stored).toContain('"tables"');
  });
});
