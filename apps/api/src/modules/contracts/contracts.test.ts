import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { TestContext, TestUser } from '../../test/test-context';
import {
  createCommunityAs,
  createTestContext,
  joinCommunity,
} from '../../test/test-context';

interface Contract {
  id: string;
  provider: string;
  amount: string;
  startOn: string;
  renewalOn: string;
  status: string;
}

describe('Módulo de contratos de mantenimiento', () => {
  let ctx: TestContext;
  let owner: TestUser;
  let member: TestUser;
  let communityId: string;
  let contractId: string;

  const validBody = {
    provider: 'Ascensores Orona SL',
    service: 'Mantenimiento preventivo del ascensor',
    amount: '95.50',
    startOn: '2026-01-01',
    renewalOn: '2027-01-01',
  };

  const createContract = (
    cookie: string,
    body: Record<string, unknown>,
  ): Promise<Response> =>
    ctx.request(`/api/communities/${communityId}/contracts`, {
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
    communityId = await createCommunityAs(ctx, owner);
    await joinCommunity(ctx, communityId, owner, member, 'member');
  });

  afterAll(async () => {
    await ctx.close();
  });

  it('los miembros leen contratos; no los crean', async () => {
    const read = await ctx.request(`/api/communities/${communityId}/contracts`, {
      cookie: member.cookie,
    });
    expect(read.status).toBe(200);

    const forbidden = await createContract(member.cookie, validBody);
    expect(forbidden.status).toBe(403);
  });

  it('el presidente registra un contrato vigente', async () => {
    const res = await createContract(owner.cookie, validBody);
    expect(res.status).toBe(201);
    const contract = (await res.json()) as Contract;
    expect(contract.status).toBe('active');
    expect(contract.amount).toBe('95.50');
    contractId = contract.id;
  });

  it('rechaza renovaciones anteriores al inicio', async () => {
    const res = await createContract(owner.cookie, {
      ...validBody,
      provider: 'Servicios Malos SL',
      startOn: '2027-01-01',
      renewalOn: '2026-01-01',
    });
    expect(res.status).toBe(400);
  });

  it('permite finalizar el contrato con auditoría', async () => {
    const patch = await ctx.request(
      `/api/communities/${communityId}/contracts/${contractId}`,
      { method: 'PATCH', cookie: owner.cookie, body: { status: 'ended' } },
    );
    expect(patch.status).toBe(200);

    const list = await ctx.request(`/api/communities/${communityId}/contracts`, {
      cookie: member.cookie,
    });
    const rows = (await list.json()) as Contract[];
    expect(rows.find((row) => row.id === contractId)?.status).toBe('ended');

    const audit = await ctx.request(
      `/api/communities/${communityId}/audit-events?limit=20`,
      { cookie: owner.cookie },
    );
    const actions = ((await audit.json()) as Array<{ action: string }>).map(
      (event) => event.action,
    );
    expect(actions).toContain('contract.created');
    expect(actions).toContain('contract.status_changed');
  });

  it('el miembro no elimina contratos; el presidente sí', async () => {
    const forbiddenRes = await ctx.request(
      `/api/communities/${communityId}/contracts/${contractId}`,
      { method: 'DELETE', cookie: member.cookie },
    );
    expect(forbiddenRes.status).toBe(403);

    const deleteRes = await ctx.request(
      `/api/communities/${communityId}/contracts/${contractId}`,
      { method: 'DELETE', cookie: owner.cookie },
    );
    expect(deleteRes.status).toBe(200);
  });
});
