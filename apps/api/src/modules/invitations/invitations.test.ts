import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { invitations } from '../../db/schema';
import type { TestContext, TestUser } from '../../test/test-context';
import { createCommunityAs, createTestContext } from '../../test/test-context';

interface InviteResponse {
  invitation: { id: string; status: string; email: string };
  token: string;
}

describe('Módulo de invitaciones', () => {
  let ctx: TestContext;
  let owner: TestUser;
  let member: TestUser;
  let communityId: string;

  const invite = (
    cookie: string,
    body: { email: string; role: string },
  ): Promise<Response> =>
    ctx.request(`/api/communities/${communityId}/invitations`, {
      method: 'POST',
      cookie,
      body,
    });

  const accept = (cookie: string, token: string): Promise<Response> =>
    ctx.request('/api/invitations/accept', {
      method: 'POST',
      cookie,
      body: { token },
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

    // El propietario añade a Vicente como miembro para probar permisos.
    const inviteRes = await invite(owner.cookie, {
      email: member.email,
      role: 'member',
    });
    const { token } = (await inviteRes.json()) as InviteResponse;
    const acceptRes = await accept(member.cookie, token);
    expect(acceptRes.status).toBe(200);
  });

  afterAll(async () => {
    await ctx.close();
  });

  it('un miembro normal no puede crear invitaciones', async () => {
    const res = await invite(member.cookie, {
      email: 'otro@ejemplo.local',
      role: 'member',
    });
    expect(res.status).toBe(403);
  });

  it('devuelve el token una sola vez y la lista nunca lo incluye', async () => {
    const res = await invite(owner.cookie, {
      email: 'nuevo@ejemplo.local',
      role: 'resident',
    });
    expect(res.status).toBe(201);
    const created = (await res.json()) as InviteResponse;
    expect(created.token).toHaveLength(64);
    expect(created.invitation.status).toBe('pending');

    const list = await ctx.request(`/api/communities/${communityId}/invitations`, {
      cookie: owner.cookie,
    });
    const rows = (await list.json()) as Array<Record<string, unknown>>;
    expect(rows.length).toBeGreaterThan(1);
    expect(JSON.stringify(rows)).not.toContain(created.token);
    expect(rows.every((row) => !('token' in row))).toBe(true);
  });

  it('no permite dos invitaciones pendientes para el mismo email', async () => {
    const res = await invite(owner.cookie, {
      email: 'duplicado@ejemplo.local',
      role: 'member',
    });
    expect(res.status).toBe(201);
    const again = await invite(owner.cookie, {
      email: 'duplicado@ejemplo.local',
      role: 'member',
    });
    expect(again.status).toBe(409);
  });

  it('el token es de uso único', async () => {
    const res = await invite(owner.cookie, {
      email: 'usounico@ejemplo.local',
      role: 'member',
    });
    const { token } = (await res.json()) as InviteResponse;
    const guest = await ctx.signUp({
      name: 'Unico',
      email: 'usounico@ejemplo.local',
      password: 'Password123!',
    });

    expect((await accept(guest.cookie, token)).status).toBe(200);
    const second = await accept(guest.cookie, token);
    expect(second.status).toBe(409);
  });

  it('rechaza a un invitado con otro email', async () => {
    const res = await invite(owner.cookie, {
      email: 'destinatario@ejemplo.local',
      role: 'member',
    });
    const { token } = (await res.json()) as InviteResponse;
    const impostor = await ctx.signUp({
      name: 'Impostor',
      email: 'impostor@ejemplo.local',
      password: 'Password123!',
    });

    const acceptRes = await accept(impostor.cookie, token);
    expect(acceptRes.status).toBe(403);
  });

  it('rechaza una invitación revocada', async () => {
    const res = await invite(owner.cookie, {
      email: 'revocado@ejemplo.local',
      role: 'member',
    });
    const created = (await res.json()) as InviteResponse;

    const revoke = await ctx.request(
      `/api/communities/${communityId}/invitations/${created.invitation.id}`,
      { method: 'DELETE', cookie: owner.cookie },
    );
    expect(revoke.status).toBe(200);

    const guest = await ctx.signUp({
      name: 'Revocado',
      email: 'revocado@ejemplo.local',
      password: 'Password123!',
    });
    const acceptRes = await accept(guest.cookie, created.token);
    expect(acceptRes.status).toBe(403);
  });

  it('rechaza una invitación caducada', async () => {
    const res = await invite(owner.cookie, {
      email: 'caducada@ejemplo.local',
      role: 'member',
    });
    const created = (await res.json()) as InviteResponse;

    // Simulamos la caducación directamente en base de datos.
    await ctx.db
      .update(invitations)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(invitations.id, created.invitation.id));

    const guest = await ctx.signUp({
      name: 'Caducada',
      email: 'caducada@ejemplo.local',
      password: 'Password123!',
    });
    const acceptRes = await accept(guest.cookie, created.token);
    expect(acceptRes.status).toBe(409);
  });

  it('las invitaciones pendientes se listan por email del invitado', async () => {
    await invite(owner.cookie, {
      email: 'pendientes@ejemplo.local',
      role: 'resident',
    });

    const guest = await ctx.signUp({
      name: 'Pendientes',
      email: 'pendientes@ejemplo.local',
      password: 'Password123!',
    });
    const res = await ctx.request('/api/invitations/pending', {
      cookie: guest.cookie,
    });
    expect(res.status).toBe(200);
    const rows = (await res.json()) as Array<{ communityName: string }>;
    expect(rows).toHaveLength(1);
    expect(rows[0]?.communityName).toBe('Comunidad de prueba');
  });

  it('un token inventado responde 404', async () => {
    const acceptRes = await accept(member.cookie, 'f'.repeat(64));
    expect(acceptRes.status).toBe(404);
  });
});
