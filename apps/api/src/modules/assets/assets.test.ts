import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { TestContext, TestUser } from '../../test/test-context';
import {
  createCommunityAs,
  createTestContext,
  joinCommunity,
} from '../../test/test-context';

interface Asset {
  id: string;
  name: string;
  category: string;
  status: string;
  warrantyUntil: string | null;
}

describe('Módulo de inventario (activos)', () => {
  let ctx: TestContext;
  let owner: TestUser;
  let member: TestUser;
  let communityId: string;
  let assetId: string;

  const createAsset = (
    cookie: string,
    body: Record<string, unknown>,
  ): Promise<Response> =>
    ctx.request(`/api/communities/${communityId}/assets`, {
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

  it('los miembros consultan el inventario; no lo gestionan', async () => {
    const read = await ctx.request(`/api/communities/${communityId}/assets`, {
      cookie: member.cookie,
    });
    expect(read.status).toBe(200);
    await expect(read.json()).resolves.toEqual([]);

    const forbidden = await createAsset(member.cookie, {
      name: 'Ascensor',
      category: 'elevator',
    });
    expect(forbidden.status).toBe(403);
  });

  it('el presidente da de alta elementos con garantía', async () => {
    const res = await createAsset(owner.cookie, {
      name: 'Ascensor Orona 4',
      category: 'elevator',
      location: 'Portal 1',
      warrantyUntil: '2028-06-30',
      notes: 'Revisión semestral.',
    });
    expect(res.status).toBe(201);
    const asset = (await res.json()) as Asset;
    expect(asset.status).toBe('operational');
    expect(asset.warrantyUntil).toBe('2028-06-30');
    assetId = asset.id;
  });

  it('valida la categoría y permite cambiar el estado', async () => {
    const badCategory = await createAsset(owner.cookie, {
      name: 'Elemento raro',
      category: 'spaceship',
    });
    expect(badCategory.status).toBe(400);

    const patch = await ctx.request(
      `/api/communities/${communityId}/assets/${assetId}`,
      {
        method: 'PATCH',
        cookie: owner.cookie,
        body: { status: 'broken' },
      },
    );
    expect(patch.status).toBe(200);

    const list = await ctx.request(`/api/communities/${communityId}/assets`, {
      cookie: member.cookie,
    });
    const rows = (await list.json()) as Asset[];
    expect(rows.find((row) => row.id === assetId)?.status).toBe('broken');
  });

  it('audita y permite eliminar (solo admin)', async () => {
    const forbiddenRes = await ctx.request(
      `/api/communities/${communityId}/assets/${assetId}`,
      { method: 'DELETE', cookie: member.cookie },
    );
    expect(forbiddenRes.status).toBe(403);

    const deleteRes = await ctx.request(
      `/api/communities/${communityId}/assets/${assetId}`,
      { method: 'DELETE', cookie: owner.cookie },
    );
    expect(deleteRes.status).toBe(200);

    const audit = await ctx.request(
      `/api/communities/${communityId}/audit-events?limit=20`,
      { cookie: owner.cookie },
    );
    const actions = ((await audit.json()) as Array<{ action: string }>).map(
      (event) => event.action,
    );
    expect(actions).toContain('asset.created');
    expect(actions).toContain('asset.updated');
    expect(actions).toContain('asset.deleted');
  });
});
