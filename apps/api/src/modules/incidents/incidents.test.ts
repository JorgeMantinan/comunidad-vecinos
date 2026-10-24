import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { TestContext, TestUser } from '../../test/test-context';
import {
  createCommunityAs,
  createTestContext,
  joinCommunity,
} from '../../test/test-context';

interface Incident {
  id: string;
  status: string;
  reportedByName: string | null;
  resolvedAt: string | null;
}

describe('Módulo de incidencias', () => {
  let ctx: TestContext;
  let owner: TestUser;
  let member: TestUser;
  let resident: TestUser;
  let communityId: string;
  let incidentId: string;

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

  it('la residente puede reportar incidencias (cualquier miembro)', async () => {
    const res = await ctx.request(`/api/communities/${communityId}/incidents`, {
      method: 'POST',
      cookie: resident.cookie,
      body: {
        title: 'Fuga en el trastero',
        description: 'Hay agua goteando en la bajante del trastero.',
      },
    });
    expect(res.status).toBe(201);
    const incident = (await res.json()) as Incident;
    expect(incident.status).toBe('open');
    expect(incident.reportedByName).toBe('Rosa Residente');
    expect(incident.resolvedAt).toBeNull();
    incidentId = incident.id;
  });

  it('los miembros leen las incidencias y no las gestionan', async () => {
    const read = await ctx.request(`/api/communities/${communityId}/incidents`, {
      cookie: member.cookie,
    });
    expect(read.status).toBe(200);
    expect(((await read.json()) as Incident[]).length).toBe(1);

    const patch = await ctx.request(
      `/api/communities/${communityId}/incidents/${incidentId}`,
      { method: 'PATCH', cookie: member.cookie, body: { status: 'resolved' } },
    );
    expect(patch.status).toBe(403);
  });

  it('la junta gestiona los estados y marca la resolución', async () => {
    const start = await ctx.request(
      `/api/communities/${communityId}/incidents/${incidentId}`,
      { method: 'PATCH', cookie: owner.cookie, body: { status: 'in_progress' } },
    );
    expect(start.status).toBe(200);

    const resolve = await ctx.request(
      `/api/communities/${communityId}/incidents/${incidentId}`,
      { method: 'PATCH', cookie: owner.cookie, body: { status: 'resolved' } },
    );
    expect(resolve.status).toBe(200);

    const list = await ctx.request(`/api/communities/${communityId}/incidents`, {
      cookie: member.cookie,
    });
    const [incident] = (await list.json()) as Incident[];
    expect(incident?.status).toBe('resolved');
    expect(incident?.resolvedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    // Reabrir limpia la fecha de resolución.
    const reopen = await ctx.request(
      `/api/communities/${communityId}/incidents/${incidentId}`,
      { method: 'PATCH', cookie: owner.cookie, body: { status: 'open' } },
    );
    expect(reopen.status).toBe(200);
    const after = await ctx.request(`/api/communities/${communityId}/incidents`, {
      cookie: owner.cookie,
    });
    const [reopened] = (await after.json()) as Incident[];
    expect(reopened?.resolvedAt).toBeNull();

    const audit = await ctx.request(
      `/api/communities/${communityId}/audit-events?limit=20`,
      { cookie: owner.cookie },
    );
    const actions = ((await audit.json()) as Array<{ action: string }>).map(
      (event) => event.action,
    );
    expect(actions).toContain('incident.created');
    expect(actions).toContain('incident.status_changed');
  });

  it('solo owner/admin pueden eliminar incidencias', async () => {
    const forbiddenRes = await ctx.request(
      `/api/communities/${communityId}/incidents/${incidentId}`,
      { method: 'DELETE', cookie: resident.cookie },
    );
    expect(forbiddenRes.status).toBe(403);

    const deleteRes = await ctx.request(
      `/api/communities/${communityId}/incidents/${incidentId}`,
      { method: 'DELETE', cookie: owner.cookie },
    );
    expect(deleteRes.status).toBe(200);
  });
});
