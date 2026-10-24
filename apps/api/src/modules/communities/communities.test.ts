import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { TestContext, TestUser } from '../../test/test-context';
import { createCommunityAs, createTestContext } from '../../test/test-context';

describe('Módulo de comunidades', () => {
  let ctx: TestContext;
  let owner: TestUser;

  beforeAll(async () => {
    ctx = await createTestContext();
    owner = await ctx.signUp({
      name: 'Elena Presidenta',
      email: 'presidente@ejemplo.local',
      password: 'Password123!',
    });
  });

  afterAll(async () => {
    await ctx.close();
  });

  it('GET /api/health responde ok sin autenticación', async () => {
    const res = await ctx.request('/api/health');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string };
    expect(body.status).toBe('ok');
  });

  it('exige autenticación para acceder a comunidades', async () => {
    const res = await ctx.request('/api/communities');
    expect(res.status).toBe(401);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe('unauthorized');
  });

  it('crea una comunidad y al creador lo deja como presidente', async () => {
    const res = await ctx.request('/api/communities', {
      method: 'POST',
      cookie: owner.cookie,
      body: { name: 'Comunidad Calle Mayor 12', address: 'Calle Mayor 12' },
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: string; role: string };
    expect(body.role).toBe('owner');
    expect(body.id).toMatch(/^cm_[0-9a-f]{32}$/);
  });

  it('lista solo las comunidades del usuario autenticado', async () => {
    const res = await ctx.request('/api/communities', {
      cookie: owner.cookie,
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Array<{ id: string; role: string }>;
    expect(body.length).toBeGreaterThan(0);
    expect(body.every((community) => community.role === 'owner')).toBe(true);
  });

  it('valida la entrada con Zod y rechaza nombres demasiado cortos', async () => {
    const res = await ctx.request('/api/communities', {
      method: 'POST',
      cookie: owner.cookie,
      body: { name: 'X' },
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe('validation_error');
  });

  it('un miembro ve a los demás miembros de su comunidad', async () => {
    const communityId = await createCommunityAs(ctx, owner, 'Comunidad Vecinos');
    const res = await ctx.request(`/api/communities/${communityId}/members`, {
      cookie: owner.cookie,
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Array<{ role: string }>;
    expect(body).toHaveLength(1);
    expect(body[0]?.role).toBe('owner');
  });
});

describe('Aislamiento entre comunidades', () => {
  let ctx: TestContext;
  let owner: TestUser;
  let intruder: TestUser;
  let communityId: string;

  beforeAll(async () => {
    ctx = await createTestContext();
    owner = await ctx.signUp({
      name: 'Elena Presidenta',
      email: 'presidente@ejemplo.local',
      password: 'Password123!',
    });
    intruder = await ctx.signUp({
      name: 'Malo Maloso',
      email: 'intruso@ejemplo.local',
      password: 'Password123!',
    });
    communityId = await createCommunityAs(ctx, owner);
  });

  afterAll(async () => {
    await ctx.close();
  });

  it('la comunidad de otro usuario no aparece en el listado', async () => {
    const res = await ctx.request('/api/communities', {
      cookie: intruder.cookie,
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as unknown[];
    expect(body).toHaveLength(0);
  });

  it('acceder por ID ajeno responde 404, sin filtrar datos', async () => {
    const res = await ctx.request(`/api/communities/${communityId}`, {
      cookie: intruder.cookie,
    });
    expect(res.status).toBe(404);
    const text = await res.text();
    expect(text).not.toContain('Comunidad de prueba');
  });

  it('manipular el ID en rutas hijas tampoco funciona', async () => {
    const members = await ctx.request(`/api/communities/${communityId}/members`, {
      cookie: intruder.cookie,
    });
    expect(members.status).toBe(404);

    const invitations = await ctx.request(
      `/api/communities/${communityId}/invitations`,
      { cookie: intruder.cookie },
    );
    expect(invitations.status).toBe(404);

    const audit = await ctx.request(`/api/communities/${communityId}/audit-events`, {
      cookie: intruder.cookie,
    });
    expect(audit.status).toBe(404);
  });

  it('las acciones sobre la comunidad ajena tampoco son posibles', async () => {
    const invite = await ctx.request(`/api/communities/${communityId}/invitations`, {
      method: 'POST',
      cookie: intruder.cookie,
      body: { email: 'nuevo@ejemplo.local', role: 'member' },
    });
    expect(invite.status).toBe(404);
  });
});
