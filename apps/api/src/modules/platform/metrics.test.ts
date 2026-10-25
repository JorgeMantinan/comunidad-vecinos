import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { TestContext, TestUser } from '../../test/test-context';
import { createCommunityAs, createTestContext } from '../../test/test-context';

interface Metrics {
  users: number;
  communities: number;
  memberships: number;
  activeSessions: number;
  pendingInvitations: number;
  auditEvents: number;
  storedBytes: number;
}

describe('Métricas de cuota de plataforma', () => {
  let ctx: TestContext;
  let platformAdmin: TestUser;
  let plain: TestUser;
  const previousEmails = process.env.PLATFORM_ADMIN_EMAILS;

  beforeAll(async () => {
    process.env.PLATFORM_ADMIN_EMAILS = 'plataforma@ejemplo.local';
    ctx = await createTestContext();
    platformAdmin = await ctx.signUp({
      name: 'Operador',
      email: 'plataforma@ejemplo.local',
      password: 'Password123!',
    });
    plain = await ctx.signUp({
      name: 'Vicente Vecino',
      email: 'vecino@ejemplo.local',
      password: 'Password123!',
    });
    await createCommunityAs(ctx, platformAdmin, 'Comunidad Métricas');
  });

  afterAll(async () => {
    if (previousEmails === undefined) {
      delete process.env.PLATFORM_ADMIN_EMAILS;
    } else {
      process.env.PLATFORM_ADMIN_EMAILS = previousEmails;
    }
    await ctx.close();
  });

  it('la administración de plataforma ve los agregados de cuota', async () => {
    const res = await ctx.request('/api/platform/metrics', {
      cookie: platformAdmin.cookie,
    });
    expect(res.status).toBe(200);
    const metrics = (await res.json()) as Metrics;

    expect(metrics.users).toBe(2);
    expect(metrics.communities).toBe(1);
    expect(metrics.memberships).toBe(1);
    expect(metrics.activeSessions).toBeGreaterThanOrEqual(2);
    expect(metrics.auditEvents).toBeGreaterThan(0);
    expect(metrics.storedBytes).toBe(0);
    expect(Object.keys(metrics).sort()).toEqual([
      'activeSessions',
      'auditEvents',
      'communities',
      'memberships',
      'pendingInvitations',
      'storedBytes',
      'users',
    ]);
  });

  it('las demás cuentas no ven métricas globales', async () => {
    const res = await ctx.request('/api/platform/metrics', {
      cookie: plain.cookie,
    });
    expect(res.status).toBe(403);
  });
});
