import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { TestContext, TestUser } from '../../test/test-context';
import {
  createCommunityAs,
  createTestContext,
  joinCommunity,
} from '../../test/test-context';

interface EconomyReport {
  from: string;
  to: string;
  expenses: {
    count: number;
    total: string;
    paidTotal: string;
    pendingTotal: string;
    byCategory: Array<{ category: string; total: string }>;
  };
  invoices: { count: number; total: string; paidTotal: string };
}

describe('Informe económico por periodo', () => {
  let ctx: TestContext;
  let owner: TestUser;
  let member: TestUser;
  let resident: TestUser;
  let communityId: string;

  const createExpense = (body: Record<string, unknown>): Promise<Response> =>
    ctx.request(`/api/communities/${communityId}/expenses`, {
      method: 'POST',
      cookie: owner.cookie,
      body,
    });

  beforeAll(async () => {
    ctx = await createTestContext();
    owner = await ctx.signUp({
      name: 'Elena Presidenta',
      email: 'presidente@ejemplo.local',
      password: 'Password123!',
    });
    member = await ctx.signUp({
      name: 'Vicente Vecino',
      email: 'vecino@ejemplo.local',
      password: 'Password123!',
    });
    resident = await ctx.signUp({
      name: 'Rosa Residente',
      email: 'residente@ejemplo.local',
      password: 'Password123!',
    });
    communityId = await createCommunityAs(ctx, owner);
    await joinCommunity(ctx, communityId, owner, member, 'member');
    await joinCommunity(ctx, communityId, owner, resident, 'resident');

    // Dos gastos en 2026 (uno pagado) y uno fuera de periodo.
    const first = await createExpense({
      concept: 'Agua',
      amount: '60.30',
      category: 'supply',
      incurredOn: '2026-03-01',
    });
    const created = (await first.json()) as { id: string };
    await ctx.request(`/api/communities/${communityId}/expenses/${created.id}/pay`, {
      method: 'POST',
      cookie: owner.cookie,
      body: {},
    });
    await createExpense({
      concept: 'Pintura',
      amount: '39.70',
      category: 'repair',
      incurredOn: '2026-05-10',
    });
    await createExpense({
      concept: 'Fuera de periodo',
      amount: '999.00',
      category: 'other',
      incurredOn: '2025-12-31',
    });

    await ctx.request(`/api/communities/${communityId}/invoices`, {
      method: 'POST',
      cookie: owner.cookie,
      body: {
        number: 'F-100',
        supplier: 'Suministros SL',
        amount: '10.00',
        issuedOn: '2026-04-01',
      },
    });
  });

  afterAll(async () => {
    await ctx.close();
  });

  it('agrega solo el periodo solicitado con decimales exactos', async () => {
    const res = await ctx.request(
      `/api/communities/${communityId}/reports/economy?from=2026-01-01&to=2026-12-31`,
      { cookie: member.cookie },
    );
    expect(res.status).toBe(200);
    const report = (await res.json()) as EconomyReport;

    expect(report.expenses.count).toBe(2);
    expect(report.expenses.total).toBe('100.00');
    expect(report.expenses.pendingTotal).toBe('39.70');
    expect(report.invoices.count).toBe(1);
    expect(report.invoices.total).toBe('10.00');
    const categories = Object.fromEntries(
      report.expenses.byCategory.map((row) => [row.category, row.total]),
    );
    expect(categories.supply).toBe('60.30');
    expect(categories.repair).toBe('39.70');
    expect(categories.other).toBeUndefined();
  });

  it('la residente no lee el informe', async () => {
    const res = await ctx.request(`/api/communities/${communityId}/reports/economy`, {
      cookie: resident.cookie,
    });
    expect(res.status).toBe(403);
  });

  it('el CSV descarga gastos y facturas del periodo (solo admin)', async () => {
    const memberCsv = await ctx.request(
      `/api/communities/${communityId}/reports/economy.csv`,
      { cookie: member.cookie },
    );
    expect(memberCsv.status).toBe(403);

    const res = await ctx.request(
      `/api/communities/${communityId}/reports/economy.csv?from=2026-01-01&to=2026-12-31`,
      { cookie: owner.cookie },
    );
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/csv');
    expect(res.headers.get('content-disposition')).toContain('attachment');

    const csv = await res.text();
    expect(csv).toContain('"tipo"');
    expect(csv).toContain('"gasto","Agua","60.30"');
    expect(csv).toContain('"factura","Suministros SL","10.00"');
    // Fuera de periodo y archivos binarios jamás aparecen.
    expect(csv).not.toContain('Fuera de periodo');
  });
});
