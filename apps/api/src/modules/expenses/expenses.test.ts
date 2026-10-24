import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { TestContext, TestUser } from '../../test/test-context';
import {
  createCommunityAs,
  createTestContext,
  joinCommunity,
} from '../../test/test-context';

interface Expense {
  id: string;
  concept: string;
  amount: string;
  category: string;
  incurredOn: string;
  status: string;
  paidOn: string | null;
}

describe('Módulo de gastos', () => {
  let ctx: TestContext;
  let owner: TestUser;
  let member: TestUser;
  let resident: TestUser;
  let communityId: string;
  let expenseId: string;

  const createExpense = (
    cookie: string,
    body: Record<string, unknown>,
  ): Promise<Response> =>
    ctx.request(`/api/communities/${communityId}/expenses`, {
      method: 'POST',
      cookie,
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
  });

  afterAll(async () => {
    await ctx.close();
  });

  it('la residente no accede a la información económica', async () => {
    const res = await ctx.request(`/api/communities/${communityId}/expenses`, {
      cookie: resident.cookie,
    });
    expect(res.status).toBe(403);
  });

  it('el propietario sí puede consultar los gastos', async () => {
    const res = await ctx.request(`/api/communities/${communityId}/expenses`, {
      cookie: member.cookie,
    });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual([]);
  });

  it('un propietario no puede registrar gastos', async () => {
    const res = await createExpense(member.cookie, {
      concept: 'Pintura del rellano',
      amount: '80.00',
      category: 'repair',
      incurredOn: '2026-10-01',
    });
    expect(res.status).toBe(403);
  });

  it('el presidente registra un gasto con importe decimal exacto', async () => {
    const res = await createExpense(owner.cookie, {
      concept: 'Suministro de agua',
      amount: '125.40',
      category: 'supply',
      incurredOn: '2026-10-01',
    });
    expect(res.status).toBe(201);
    const expense = (await res.json()) as Expense;
    expect(expense.status).toBe('registered');
    expect(expense.amount).toBe('125.40');
    expect(expense.paidOn).toBeNull();
    expenseId = expense.id;
  });

  it('valida el importe y la fecha con Zod', async () => {
    const badAmount = await createExpense(owner.cookie, {
      concept: 'Importe malformado',
      amount: '10,50',
      category: 'supply',
      incurredOn: '2026-10-01',
    });
    expect(badAmount.status).toBe(400);

    const badDate = await createExpense(owner.cookie, {
      concept: 'Fecha malformada',
      amount: '10.00',
      category: 'supply',
      incurredOn: '01/10/2026',
    });
    expect(badDate.status).toBe(400);
  });

  it('transiciona de registrado a pagado una sola vez', async () => {
    const pay = await ctx.request(
      `/api/communities/${communityId}/expenses/${expenseId}/pay`,
      { method: 'POST', cookie: owner.cookie, body: {} },
    );
    expect(pay.status).toBe(200);

    const list = await ctx.request(`/api/communities/${communityId}/expenses`, {
      cookie: member.cookie,
    });
    const rows = (await list.json()) as Expense[];
    const paid = rows.find((row) => row.id === expenseId);
    expect(paid?.status).toBe('paid');
    expect(paid?.paidOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const repeat = await ctx.request(
      `/api/communities/${communityId}/expenses/${expenseId}/pay`,
      { method: 'POST', cookie: owner.cookie, body: {} },
    );
    expect(repeat.status).toBe(409);
  });

  it('audita la creación y el pago', async () => {
    const audit = await ctx.request(
      `/api/communities/${communityId}/audit-events?limit=50`,
      { cookie: owner.cookie },
    );
    const actions = ((await audit.json()) as Array<{ action: string }>).map(
      (event) => event.action,
    );
    expect(actions).toContain('expense.created');
    expect(actions).toContain('expense.paid');
  });

  it('el propietario no puede editar ni eliminar gastos', async () => {
    const patch = await ctx.request(
      `/api/communities/${communityId}/expenses/${expenseId}`,
      {
        method: 'PATCH',
        cookie: member.cookie,
        body: { amount: '1.00' },
      },
    );
    expect(patch.status).toBe(403);

    const remove = await ctx.request(
      `/api/communities/${communityId}/expenses/${expenseId}`,
      { method: 'DELETE', cookie: member.cookie },
    );
    expect(remove.status).toBe(403);

    const byOwner = await ctx.request(
      `/api/communities/${communityId}/expenses/${expenseId}`,
      { method: 'DELETE', cookie: owner.cookie },
    );
    expect(byOwner.status).toBe(200);
  });
});
