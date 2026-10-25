import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { announcements } from '../../db/schema';
import type { TestContext, TestUser } from '../../test/test-context';
import {
  createCommunityAs,
  createTestContext,
  joinCommunity,
} from '../../test/test-context';

interface Announcement {
  id: string;
  title: string;
  body: string;
  authorName: string | null;
  expiresAt: string | null;
}

describe('Módulo de avisos', () => {
  let ctx: TestContext;
  let owner: TestUser;
  let member: TestUser;
  let resident: TestUser;
  let communityId: string;

  const createAnnouncement = (
    cookie: string,
    body: Record<string, unknown>,
  ): Promise<Response> =>
    ctx.request(`/api/communities/${communityId}/announcements`, {
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

  it('cualquier miembro puede leer los avisos', async () => {
    const res = await ctx.request(`/api/communities/${communityId}/announcements`, {
      cookie: resident.cookie,
    });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual([]);
  });

  it('un propietario no puede publicar avisos', async () => {
    const res = await createAnnouncement(member.cookie, {
      title: 'Corte de agua',
      body: 'Mañana de 9 a 12 habrá corte de agua.',
    });
    expect(res.status).toBe(403);
  });

  it('el presidente publica un aviso y aparece con su autor', async () => {
    const res = await createAnnouncement(owner.cookie, {
      title: 'Corte de agua',
      body: 'Mañana de 9 a 12 habrá corte de agua en todo el portal.',
    });
    expect(res.status).toBe(201);
    const created = (await res.json()) as Announcement;
    expect(created.authorName).toBe('Elena Presidenta');
    expect(created.expiresAt).toBeNull();

    const list = await ctx.request(`/api/communities/${communityId}/announcements`, {
      cookie: member.cookie,
    });
    const rows = (await list.json()) as Announcement[];
    expect(rows.map((row) => row.title)).toContain('Corte de agua');
  });

  it('notifica por correo a los miembros (nunca al autor)', async () => {
    const announcementMail = ctx.email.sent.filter((message) =>
      message.subject.includes('Nuevo aviso'),
    );
    const toMember = announcementMail.find(
      (message) => message.to === 'vecino@ejemplo.local',
    );
    expect(toMember).toBeDefined();
    expect(toMember?.subject).toContain('Corte de agua');
    expect(toMember?.text).toContain('Ver avisos: http://localhost:5173');

    expect(
      announcementMail.some((message) => message.to === 'residente@ejemplo.local'),
    ).toBe(true);
    // El autor ya lo ha escrito: no se notifica a sí mismo.
    expect(
      announcementMail.some((message) => message.to === 'presidente@ejemplo.local'),
    ).toBe(false);
  });

  it('rechaza una caducidad en el pasado', async () => {
    const res = await createAnnouncement(owner.cookie, {
      title: 'Aviso caducado',
      body: 'No debería poder crearse con fecha pasada.',
      expiresAt: new Date(Date.now() - 60_000).toISOString(),
    });
    expect(res.status).toBe(400);
  });

  it('oculta los avisos caducados del listado', async () => {
    const res = await createAnnouncement(owner.cookie, {
      title: 'Reunión de escalera',
      body: 'Se repintará la escalera la semana entrante.',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    });
    const created = (await res.json()) as Announcement;

    // Caducamos el aviso directamente en base de datos.
    await ctx.db
      .update(announcements)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(announcements.id, created.id));

    const list = await ctx.request(`/api/communities/${communityId}/announcements`, {
      cookie: member.cookie,
    });
    const rows = (await list.json()) as Announcement[];
    expect(rows.map((row) => row.title)).not.toContain('Reunión de escalera');
  });

  it('solo owner/admin pueden eliminar avisos, y queda auditado', async () => {
    const list = await ctx.request(`/api/communities/${communityId}/announcements`, {
      cookie: owner.cookie,
    });
    const rows = (await list.json()) as Announcement[];
    const target = rows.find((row) => row.title === 'Corte de agua');
    expect(target).toBeDefined();

    const forbiddenRes = await ctx.request(
      `/api/communities/${communityId}/announcements/${target?.id}`,
      { method: 'DELETE', cookie: member.cookie },
    );
    expect(forbiddenRes.status).toBe(403);

    const deleteRes = await ctx.request(
      `/api/communities/${communityId}/announcements/${target?.id}`,
      { method: 'DELETE', cookie: owner.cookie },
    );
    expect(deleteRes.status).toBe(200);

    const after = await ctx.request(`/api/communities/${communityId}/announcements`, {
      cookie: owner.cookie,
    });
    const remaining = (await after.json()) as Announcement[];
    expect(remaining.map((row) => row.title)).not.toContain('Corte de agua');

    const audit = await ctx.request(
      `/api/communities/${communityId}/audit-events?limit=50`,
      { cookie: owner.cookie },
    );
    const events = (await audit.json()) as Array<{ action: string }>;
    expect(events.map((event) => event.action)).toContain('announcement.deleted');
  });
});
