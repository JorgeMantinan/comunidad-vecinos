import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { TestContext, TestUser } from '../../test/test-context';
import {
  createCommunityAs,
  createTestContext,
  joinCommunity,
} from '../../test/test-context';

interface Stats {
  members: number;
  units: number;
  announcements: number;
  meetings: number;
  incidents: { total: number; open: number };
  tasks: { total: number; done: number };
  expenses: { count: number; total: string; paidTotal: string };
  invoices: { count: number; total: string };
  recentActivity: number;
}

describe('Estadísticas de uso (SQL agregado, sin IA)', () => {
  let ctx: TestContext;
  let owner: TestUser;
  let resident: TestUser;
  let communityId: string;

  beforeAll(async () => {
    ctx = await createTestContext();
    owner = await ctx.signUp({
      name: 'Elena Presidenta',
      email: 'presidente@ejemplo.local',
      password: 'Password123!',
    });
    resident = await ctx.signUp({
      name: 'Rosa Residente',
      email: 'residente@ejemplo.local',
      password: 'Password123!',
    });
    communityId = await createCommunityAs(ctx, owner);
    await joinCommunity(ctx, communityId, owner, resident, 'resident');

    await ctx.request(`/api/communities/${communityId}/units`, {
      method: 'POST',
      cookie: owner.cookie,
      body: { number: '1ºA', coefficient: '1' },
    });
    await ctx.request(`/api/communities/${communityId}/announcements`, {
      method: 'POST',
      cookie: owner.cookie,
      body: { title: 'Aviso de estadísticas', body: 'Contenido.' },
    });
    await ctx.request(`/api/communities/${communityId}/incidents`, {
      method: 'POST',
      cookie: owner.cookie,
      body: { title: 'Ascensor parado', description: 'No responde.' },
    });
    const expense = await ctx.request(`/api/communities/${communityId}/expenses`, {
      method: 'POST',
      cookie: owner.cookie,
      body: {
        concept: 'Luz del portal',
        amount: '75.55',
        category: 'supply',
        incurredOn: '2026-10-01',
      },
    });
    const created = (await expense.json()) as { id: string };
    await ctx.request(`/api/communities/${communityId}/expenses/${created.id}/pay`, {
      method: 'POST',
      cookie: owner.cookie,
      body: {},
    });
    await ctx.request(`/api/communities/${communityId}/invoices`, {
      method: 'POST',
      cookie: owner.cookie,
      body: {
        number: 'F-STATS',
        supplier: 'Luz SL',
        amount: '75.55',
        issuedOn: '2026-10-02',
      },
    });
  });

  afterAll(async () => {
    await ctx.close();
  });

  it('agrega correctamente los contadores y sumas', async () => {
    const res = await ctx.request(`/api/communities/${communityId}/stats`, {
      cookie: owner.cookie,
    });
    expect(res.status).toBe(200);
    const stats = (await res.json()) as Stats;

    expect(stats.members).toBe(2);
    expect(stats.units).toBe(1);
    expect(stats.announcements).toBe(1);
    expect(stats.meetings).toBe(0);
    expect(stats.incidents).toEqual({ total: 1, open: 1 });
    expect(stats.tasks).toEqual({ total: 0, done: 0 });
    expect(stats.expenses.count).toBe(1);
    expect(stats.expenses.total).toBe('75.55');
    expect(stats.expenses.paidTotal).toBe('75.55');
    expect(stats.invoices.count).toBe(1);
    expect(stats.invoices.total).toBe('75.55');
    expect(stats.recentActivity).toBeGreaterThan(0);
  });

  it('la residente también puede ver las estadísticas', async () => {
    const res = await ctx.request(`/api/communities/${communityId}/stats`, {
      cookie: resident.cookie,
    });
    expect(res.status).toBe(200);
  });

  it('exige autenticación', async () => {
    const res = await ctx.request(`/api/communities/${communityId}/stats`);
    expect(res.status).toBe(401);
  });
});
