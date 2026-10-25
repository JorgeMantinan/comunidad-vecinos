import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { TestContext, TestUser } from '../../test/test-context';
import {
  createCommunityAs,
  createTestContext,
  joinCommunity,
} from '../../test/test-context';

interface OverviewEntry {
  id: string;
  name: string;
  role: string;
  metrics: {
    members: number;
    openIncidents: number;
    openTasks: number;
    pendingInvitations: number;
    contractsRenewingSoon: number;
    unpaidExpenses: string;
  };
}

describe('Panel de administración de fincas', () => {
  let ctx: TestContext;
  let admin: TestUser;
  let otherOwner: TestUser;
  let managedCommunity: string;
  let delegatedCommunity: string;
  let memberOnlyCommunity: string;

  beforeAll(async () => {
    ctx = await createTestContext();
    // Admin de dos comunidades: una como presidenta, otra como admin.
    admin = await ctx.signUp({
      name: 'Ana Administradora',
      email: 'admin@ejemplo.local',
      password: 'Password123!',
    });
    otherOwner = await ctx.signUp({
      name: 'Elena Presidenta',
      email: 'presidente@ejemplo.local',
      password: 'Password123!',
    });

    managedCommunity = await createCommunityAs(ctx, admin, 'Comunidad Gestión 1');
    delegatedCommunity = await createCommunityAs(
      ctx,
      otherOwner,
      'Comunidad Gestión 2',
    );
    await joinCommunity(ctx, delegatedCommunity, otherOwner, admin, 'admin');

    // Una comunidad donde solo es miembro: NO debe aparecer en el panel.
    memberOnlyCommunity = await createCommunityAs(
      ctx,
      otherOwner,
      'Comunidad Solo Miembro',
    );
    await joinCommunity(ctx, memberOnlyCommunity, otherOwner, admin, 'member');

    // Métricas de ejemplo en la comunidad gestionada.
    await ctx.request(`/api/communities/${managedCommunity}/incidents`, {
      method: 'POST',
      cookie: admin.cookie,
      body: { title: 'Puerta rota', description: 'No cierra bien.' },
    });
    await ctx.request(`/api/communities/${managedCommunity}/tasks`, {
      method: 'POST',
      cookie: admin.cookie,
      body: { title: 'Revisar cerradura' },
    });
    await ctx.request(`/api/communities/${managedCommunity}/invitations`, {
      method: 'POST',
      cookie: admin.cookie,
      body: { email: 'pendiente@ejemplo.local', role: 'member' },
    });
    await ctx.request(`/api/communities/${managedCommunity}/expenses`, {
      method: 'POST',
      cookie: admin.cookie,
      body: {
        concept: 'Pendiente de pago',
        amount: '100.00',
        category: 'supply',
        incurredOn: '2026-10-01',
      },
    });
    await ctx.request(`/api/communities/${managedCommunity}/contracts`, {
      method: 'POST',
      cookie: admin.cookie,
      body: {
        provider: 'Próxima renovación SL',
        service: 'Ascensor',
        amount: '50.00',
        startOn: '2026-01-01',
        renewalOn: new Date(Date.now() + 10 * 24 * 3600_000).toISOString().slice(0, 10),
      },
    });
  });

  afterAll(async () => {
    await ctx.close();
  });

  it('lista solo las comunidades donde se administra', async () => {
    const res = await ctx.request('/api/admin/overview', {
      cookie: admin.cookie,
    });
    expect(res.status).toBe(200);
    const rows = (await res.json()) as OverviewEntry[];
    const ids = rows.map((row) => row.id);

    expect(ids).toContain(managedCommunity);
    expect(ids).toContain(delegatedCommunity);
    expect(ids).not.toContain(memberOnlyCommunity);
    expect(rows.every((row) => row.role === 'owner' || row.role === 'admin')).toBe(
      true,
    );
  });

  it('agrega las métricas de cada comunidad', async () => {
    const res = await ctx.request('/api/admin/overview', {
      cookie: admin.cookie,
    });
    const rows = (await res.json()) as OverviewEntry[];
    const managed = rows.find((row) => row.id === managedCommunity);
    expect(managed).toBeDefined();
    expect(managed?.metrics.members).toBe(1);
    expect(managed?.metrics.openIncidents).toBe(1);
    expect(managed?.metrics.openTasks).toBe(1);
    expect(managed?.metrics.pendingInvitations).toBe(1);
    expect(managed?.metrics.contractsRenewingSoon).toBe(1);
    expect(Number(managed?.metrics.unpaidExpenses)).toBe(100);
  });

  it('devuelve lista vacía a quien no administra nada', async () => {
    const plain = await ctx.signUp({
      name: 'Vicente Vecino',
      email: 'vecino@ejemplo.local',
      password: 'Password123!',
    });
    const res = await ctx.request('/api/admin/overview', {
      cookie: plain.cookie,
    });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual([]);
  });

  it('exige autenticación', async () => {
    const res = await ctx.request('/api/admin/overview');
    expect(res.status).toBe(401);
  });
});
