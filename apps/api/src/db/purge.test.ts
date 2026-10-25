import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runPurge } from './purge';
import { auditEvents, invitations } from './schema';
import type { TestContext, TestUser } from '../test/test-context';
import { createCommunityAs, createTestContext } from '../test/test-context';

describe('Purga por retención de datos', () => {
  let ctx: TestContext;
  let owner: TestUser;
  let communityId: string;
  let expiredInvitationId: string;
  let recentInvitationId: string;

  beforeAll(async () => {
    ctx = await createTestContext();
    owner = await ctx.signUp({
      name: 'Elena Presidenta',
      email: 'presidente@ejemplo.local',
      password: 'Password123!',
    });
    communityId = await createCommunityAs(ctx, owner);

    const create = async (email: string): Promise<string> => {
      const res = await ctx.request(`/api/communities/${communityId}/invitations`, {
        method: 'POST',
        cookie: owner.cookie,
        body: { email, role: 'member' },
      });
      const body = (await res.json()) as { invitation: { id: string } };
      return body.invitation.id;
    };

    expiredInvitationId = await create('caducada@ejemplo.local');
    recentInvitationId = await create('reciente@ejemplo.local');

    // Antigüamos una invitación más de 90 días.
    await ctx.db
      .update(invitations)
      .set({ expiresAt: new Date(Date.now() - 100 * 24 * 3600_000) })
      .where(eq(invitations.id, expiredInvitationId));

    // Y un evento de auditoría con más de 24 meses.
    const [auditRow] = await ctx.db
      .insert(auditEvents)
      .values({
        id: 'aud_prueba_antiguo',
        communityId,
        actorId: owner.id,
        action: 'test.old',
      })
      .returning({ id: auditEvents.id });
    await ctx.db
      .update(auditEvents)
      .set({
        createdAt: new Date(Date.now() - 25 * 30 * 24 * 3600_000),
      })
      .where(eq(auditEvents.id, auditRow?.id ?? ''));
  });

  afterAll(async () => {
    await ctx.close();
  });

  it('elimina solo lo que supera la política de retención', async () => {
    const result = await runPurge(ctx.db);
    expect(result.invitations).toBe(1);
    expect(result.auditEvents).toBeGreaterThanOrEqual(1);

    const remaining = await ctx.db.select().from(invitations);
    expect(remaining.map((row) => row.id)).toEqual([recentInvitationId]);
    expect(remaining.map((row) => row.id)).not.toContain(expiredInvitationId);

    const remainingAudit = await ctx.db.select().from(auditEvents);
    expect(remainingAudit.map((row) => row.id)).not.toContain('aud_prueba_antiguo');
    // La auditoría reciente de la purga/propios actos se conserva.
    expect(remainingAudit.length).toBeGreaterThan(0);
  });

  it('es idempotente: una segunda pasada no borra nada más', async () => {
    const second = await runPurge(ctx.db);
    expect(second.invitations).toBe(0);
    expect(second.auditEvents).toBe(0);
  });
});
