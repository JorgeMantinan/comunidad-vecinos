import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { TestContext, TestUser } from '../../test/test-context';
import {
  createCommunityAs,
  createTestContext,
  joinCommunity,
} from '../../test/test-context';

interface Invoice {
  id: string;
  number: string;
  supplier: string;
  amount: string;
  status: string;
  paidOn: string | null;
}

describe('Módulo de facturas', () => {
  let ctx: TestContext;
  let owner: TestUser;
  let member: TestUser;
  let resident: TestUser;
  let communityId: string;
  let invoiceId: string;

  const createInvoice = (
    cookie: string,
    body: Record<string, unknown>,
  ): Promise<Response> =>
    ctx.request(`/api/communities/${communityId}/invoices`, {
      method: 'POST',
      cookie,
      body,
    });

  const validBody = {
    number: 'F-2026-001',
    supplier: 'Limpiezas Norte SL',
    amount: '480.00',
    issuedOn: '2026-10-01',
  };

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

  it('la residente no accede y el propietario sí lee pero no crea', async () => {
    const residentRes = await ctx.request(`/api/communities/${communityId}/invoices`, {
      cookie: resident.cookie,
    });
    expect(residentRes.status).toBe(403);

    const memberRead = await ctx.request(`/api/communities/${communityId}/invoices`, {
      cookie: member.cookie,
    });
    expect(memberRead.status).toBe(200);

    const memberCreate = await createInvoice(member.cookie, validBody);
    expect(memberCreate.status).toBe(403);
  });

  it('el presidente registra una factura recibida', async () => {
    const res = await createInvoice(owner.cookie, validBody);
    expect(res.status).toBe(201);
    const invoice = (await res.json()) as Invoice;
    expect(invoice.status).toBe('received');
    expect(invoice.paidOn).toBeNull();
    invoiceId = invoice.id;
  });

  it('no permite números duplicados ni importes inválidos', async () => {
    const duplicated = await createInvoice(owner.cookie, validBody);
    expect(duplicated.status).toBe(409);

    const badAmount = await createInvoice(owner.cookie, {
      ...validBody,
      number: 'F-2026-002',
      amount: '-10.00',
    });
    expect(badAmount.status).toBe(400);
  });

  it('transiciona a pagada una sola vez y audita', async () => {
    const pay = await ctx.request(
      `/api/communities/${communityId}/invoices/${invoiceId}/pay`,
      { method: 'POST', cookie: owner.cookie, body: {} },
    );
    expect(pay.status).toBe(200);

    const list = await ctx.request(`/api/communities/${communityId}/invoices`, {
      cookie: member.cookie,
    });
    const rows = (await list.json()) as Invoice[];
    const paid = rows.find((row) => row.id === invoiceId);
    expect(paid?.status).toBe('paid');
    expect(paid?.paidOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const repeat = await ctx.request(
      `/api/communities/${communityId}/invoices/${invoiceId}/pay`,
      { method: 'POST', cookie: owner.cookie, body: {} },
    );
    expect(repeat.status).toBe(409);

    const audit = await ctx.request(
      `/api/communities/${communityId}/audit-events?limit=20`,
      { cookie: owner.cookie },
    );
    const actions = ((await audit.json()) as Array<{ action: string }>).map(
      (event) => event.action,
    );
    expect(actions).toContain('invoice.created');
    expect(actions).toContain('invoice.paid');
  });

  it('el propietario no puede eliminar facturas', async () => {
    const forbiddenRes = await ctx.request(
      `/api/communities/${communityId}/invoices/${invoiceId}`,
      { method: 'DELETE', cookie: member.cookie },
    );
    expect(forbiddenRes.status).toBe(403);

    const deleteRes = await ctx.request(
      `/api/communities/${communityId}/invoices/${invoiceId}`,
      { method: 'DELETE', cookie: owner.cookie },
    );
    expect(deleteRes.status).toBe(200);
  });
});
