import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { TestContext, TestUser } from '../../test/test-context';
import { createCommunityAs, createTestContext } from '../../test/test-context';

interface Member {
  id: string;
  userId: string;
  role: string;
}

describe('Roles y permisos', () => {
  let ctx: TestContext;
  let owner: TestUser;
  let admin: TestUser;
  let member: TestUser;
  let communityId: string;

  const members = async (): Promise<Member[]> => {
    const res = await ctx.request(`/api/communities/${communityId}/members`, {
      cookie: owner.cookie,
    });
    return (await res.json()) as Member[];
  };

  const memberByUser = async (user: TestUser): Promise<Member> => {
    const row = (await members()).find((row) => row.userId === user.id);
    if (!row) {
      throw new Error(`No se encontró la membresía de ${user.email}`);
    }
    return row;
  };

  const changeRole = (
    cookie: string,
    memberId: string,
    role: string,
  ): Promise<Response> =>
    ctx.request(`/api/communities/${communityId}/members/${memberId}`, {
      method: 'PATCH',
      cookie,
      body: { role },
    });

  /** Invita y acepta a un usuario con el rol indicado. */
  const join = async (user: TestUser, role: string): Promise<void> => {
    const inviteRes = await ctx.request(`/api/communities/${communityId}/invitations`, {
      method: 'POST',
      cookie: owner.cookie,
      body: { email: user.email, role },
    });
    const { token } = (await inviteRes.json()) as { token: string };
    const acceptRes = await ctx.request('/api/invitations/accept', {
      method: 'POST',
      cookie: user.cookie,
      body: { token },
    });
    expect(acceptRes.status).toBe(200);
  };

  beforeAll(async () => {
    ctx = await createTestContext();
    owner = await ctx.signUp({
      name: 'Elena Presidenta',
      email: 'presidente@ejemplo.local',
      password: 'Password123!',
    });
    admin = await ctx.signUp({
      name: 'Ana Administradora',
      email: 'admin@ejemplo.local',
      password: 'Password123!',
    });
    member = await ctx.signUp({
      name: 'Vicente Vecino',
      email: 'vecino@ejemplo.local',
      password: 'Password123!',
    });
    communityId = await createCommunityAs(ctx, owner);
    await join(admin, 'admin');
    await join(member, 'member');
  });

  afterAll(async () => {
    await ctx.close();
  });

  it('el presidente puede cambiar el rol de un miembro', async () => {
    const target = await memberByUser(member);
    const res = await changeRole(owner.cookie, target.id, 'resident');
    expect(res.status).toBe(200);
    expect((await memberByUser(member)).role).toBe('resident');
  });

  it('un administrador puede gestionar a los miembros, no al presidente', async () => {
    const target = await memberByUser(member);
    const res = await changeRole(admin.cookie, target.id, 'member');
    expect(res.status).toBe(200);
    expect((await memberByUser(member)).role).toBe('member');

    const ownerMembership = await memberByUser(owner);
    const againstOwner = await changeRole(admin.cookie, ownerMembership.id, 'member');
    expect(againstOwner.status).toBe(403);
  });

  it('solo el presidente puede nombrar a otro presidente', async () => {
    const target = await memberByUser(member);
    const res = await changeRole(admin.cookie, target.id, 'owner');
    expect(res.status).toBe(403);

    const byOwner = await changeRole(owner.cookie, target.id, 'member');
    expect(byOwner.status).toBe(200);
  });

  it('un miembro no puede cambiar roles', async () => {
    const target = await memberByUser(admin);
    const res = await changeRole(member.cookie, target.id, 'resident');
    expect(res.status).toBe(403);
  });

  it('un miembro no puede eliminar a otros miembros', async () => {
    const target = await memberByUser(admin);
    const res = await ctx.request(
      `/api/communities/${communityId}/members/${target.id}`,
      { method: 'DELETE', cookie: member.cookie },
    );
    expect(res.status).toBe(403);
  });

  it('la comunidad no puede quedarse sin presidente', async () => {
    const ownerMembership = await memberByUser(owner);
    const res = await ctx.request(
      `/api/communities/${communityId}/members/${ownerMembership.id}`,
      { method: 'DELETE', cookie: owner.cookie },
    );
    expect(res.status).toBe(409);
  });

  it('el presidente puede eliminar a un miembro', async () => {
    const target = await memberByUser(member);
    const res = await ctx.request(
      `/api/communities/${communityId}/members/${target.id}`,
      { method: 'DELETE', cookie: owner.cookie },
    );
    expect(res.status).toBe(200);
    expect((await members()).some((row) => row.id === target.id)).toBe(false);
  });

  it('la auditoría registra acciones críticas y respeta permisos', async () => {
    const res = await ctx.request(`/api/communities/${communityId}/audit-events`, {
      cookie: owner.cookie,
    });
    expect(res.status).toBe(200);
    const events = (await res.json()) as Array<{ action: string }>;
    const actions = events.map((event) => event.action);
    expect(actions).toContain('community.created');
    expect(actions).toContain('invitation.created');
    expect(actions).toContain('member.role_changed');
    expect(actions).toContain('member.removed');

    const asMember = await ctx.request(`/api/communities/${communityId}/audit-events`, {
      cookie: admin.cookie,
    });
    expect(asMember.status).toBe(200);

    const asPlainMember = await ctx.request(
      `/api/communities/${communityId}/audit-events`,
      { cookie: member.cookie },
    );
    expect(asPlainMember.status).toBe(404);
  });

  it('el límite de eventos de auditoría se respeta', async () => {
    const res = await ctx.request(
      `/api/communities/${communityId}/audit-events?limit=2`,
      { cookie: owner.cookie },
    );
    expect(res.status).toBe(200);
    const events = (await res.json()) as unknown[];
    expect(events).toHaveLength(2);
  });
});
