import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { TestContext, TestUser } from '../../test/test-context';
import {
  createCommunityAs,
  createTestContext,
  joinCommunity,
} from '../../test/test-context';

interface Unit {
  id: string;
  number: string;
  coefficient: string;
}

describe('Módulo de unidades', () => {
  let ctx: TestContext;
  let owner: TestUser;
  let member: TestUser;
  let communityId: string;

  const createUnit = (
    cookie: string,
    body: Record<string, unknown>,
  ): Promise<Response> =>
    ctx.request(`/api/communities/${communityId}/units`, {
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

  it('cualquier miembro puede consultar las unidades', async () => {
    const res = await ctx.request(`/api/communities/${communityId}/units`, {
      cookie: member.cookie,
    });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual([]);
  });

  it('un propietario no puede crear unidades', async () => {
    const res = await createUnit(member.cookie, {
      number: '1ºA',
      coefficient: '1',
    });
    expect(res.status).toBe(403);
  });

  it('el presidente crea unidades con coeficientes', async () => {
    const res = await createUnit(owner.cookie, {
      portal: '1',
      number: '1ºA',
      coefficient: '1',
    });
    expect(res.status).toBe(201);
    const unit = (await res.json()) as Unit;
    expect(unit.coefficient).toBe('1');

    const list = await ctx.request(`/api/communities/${communityId}/units`, {
      cookie: member.cookie,
    });
    const rows = (await list.json()) as Unit[];
    expect(rows.map((row) => row.number)).toContain('1ºA');
  });

  it('rechaza números duplicados y coeficientes inválidos', async () => {
    const duplicated = await createUnit(owner.cookie, {
      number: '1ºA',
      coefficient: '1',
    });
    expect(duplicated.status).toBe(409);

    const zero = await createUnit(owner.cookie, {
      number: '2ºB',
      coefficient: '0',
    });
    expect(zero.status).toBe(400);

    const text = await createUnit(owner.cookie, {
      number: '3ºC',
      coefficient: 'alto',
    });
    expect(text.status).toBe(400);
  });

  it('registra la creación y permite eliminar', async () => {
    const create = await createUnit(owner.cookie, {
      number: '4ºD',
      coefficient: '0.5',
    });
    const unit = (await create.json()) as Unit;

    const audit = await ctx.request(
      `/api/communities/${communityId}/audit-events?limit=20`,
      { cookie: owner.cookie },
    );
    const actions = ((await audit.json()) as Array<{ action: string }>).map(
      (event) => event.action,
    );
    expect(actions).toContain('unit.created');

    const deleteRes = await ctx.request(
      `/api/communities/${communityId}/units/${unit.id}`,
      { method: 'DELETE', cookie: owner.cookie },
    );
    expect(deleteRes.status).toBe(200);

    const after = await ctx.request(`/api/communities/${communityId}/units`, {
      cookie: owner.cookie,
    });
    const rows = (await after.json()) as Unit[];
    expect(rows.map((row) => row.id)).not.toContain(unit.id);
  });
});
