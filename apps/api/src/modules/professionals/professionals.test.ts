import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { TestContext, TestUser } from '../../test/test-context';
import {
  createCommunityAs,
  createTestContext,
  joinCommunity,
} from '../../test/test-context';

interface Professional {
  id: string;
  name: string;
  trade: string;
  phone: string | null;
}

describe('Módulo de profesionales recomendados', () => {
  let ctx: TestContext;
  let owner: TestUser;
  let member: TestUser;
  let resident: TestUser;
  let communityId: string;
  let professionalId: string;

  const createProfessional = (
    cookie: string,
    body: Record<string, unknown>,
  ): Promise<Response> =>
    ctx.request(`/api/communities/${communityId}/professionals`, {
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

  it('cualquier miembro ve el directorio; no lo edita', async () => {
    const read = await ctx.request(`/api/communities/${communityId}/professionals`, {
      cookie: resident.cookie,
    });
    expect(read.status).toBe(200);
    await expect(read.json()).resolves.toEqual([]);

    const forbidden = await createProfessional(member.cookie, {
      name: 'Fontanero Prueba',
      trade: 'Fontanería',
    });
    expect(forbidden.status).toBe(403);
  });

  it('el presidente añade un profesional con su recomendación', async () => {
    const res = await createProfessional(owner.cookie, {
      name: 'Limpiezas Norte SL',
      trade: 'Limpieza',
      phone: '600 123 123',
      notes: 'Recomendado por la junta anterior.',
    });
    expect(res.status).toBe(201);
    const professional = (await res.json()) as Professional;
    // La ficha ya no publica quién la creó: la recomendación la firma la
    // junta, no una persona (decisión de producto 25/10/2026).
    expect(professional).not.toHaveProperty('recommendedByName');
    professionalId = professional.id;
  });

  it('valida los campos del profesional', async () => {
    const badEmail = await createProfessional(owner.cookie, {
      name: 'Electricista Rara',
      trade: 'Electricidad',
      email: 'no-es-un-email',
    });
    expect(badEmail.status).toBe(400);

    const shortName = await createProfessional(owner.cookie, {
      name: 'X',
      trade: 'Electricidad',
    });
    expect(shortName.status).toBe(400);
  });

  it('permite editar y eliminar (solo admin), con auditoría', async () => {
    const patch = await ctx.request(
      `/api/communities/${communityId}/professionals/${professionalId}`,
      {
        method: 'PATCH',
        cookie: owner.cookie,
        body: { phone: '699 999 999' },
      },
    );
    expect(patch.status).toBe(200);

    const forbiddenRes = await ctx.request(
      `/api/communities/${communityId}/professionals/${professionalId}`,
      { method: 'DELETE', cookie: member.cookie },
    );
    expect(forbiddenRes.status).toBe(403);

    const deleteRes = await ctx.request(
      `/api/communities/${communityId}/professionals/${professionalId}`,
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
    expect(actions).toContain('professional.created');
    expect(actions).toContain('professional.updated');
    expect(actions).toContain('professional.deleted');
  });
});
