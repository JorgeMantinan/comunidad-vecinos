import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { TestContext, TestUser } from '../../test/test-context';
import {
  createCommunityAs,
  createTestContext,
  joinCommunity,
} from '../../test/test-context';

interface Task {
  id: string;
  title: string;
  status: string;
  dueOn: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
}

describe('Módulo de tareas', () => {
  let ctx: TestContext;
  let owner: TestUser;
  let member: TestUser;
  let communityId: string;
  let taskId: string;

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

  it('un propietario no puede crear tareas', async () => {
    const res = await ctx.request(`/api/communities/${communityId}/tasks`, {
      method: 'POST',
      cookie: member.cookie,
      body: { title: 'Tarea de propietario' },
    });
    expect(res.status).toBe(403);
  });

  it('el presidente crea tareas con responsable y vencimiento', async () => {
    const res = await ctx.request(`/api/communities/${communityId}/tasks`, {
      method: 'POST',
      cookie: owner.cookie,
      body: {
        title: 'Revisar bomba de la cisterna',
        description: 'Comprobar presión y ruido del motor.',
        dueOn: '2026-11-30',
        assigneeId: member.id,
      },
    });
    expect(res.status).toBe(201);
    const task = (await res.json()) as Task;
    expect(task.status).toBe('todo');
    expect(task.dueOn).toBe('2026-11-30');
    expect(task.assigneeName).toBe('Vicente Vecino');
    taskId = task.id;
  });

  it('rechaza como responsable a alguien que no es miembro', async () => {
    const stranger = await ctx.signUp({
      name: 'Ajeno Ajena',
      email: 'ajena@ejemplo.local',
      password: 'Password123!',
    });
    const res = await ctx.request(`/api/communities/${communityId}/tasks`, {
      method: 'POST',
      cookie: owner.cookie,
      body: { title: 'Tarea con ajena', assigneeId: stranger.id },
    });
    expect(res.status).toBe(400);
  });

  it('los miembros leen tareas; la junta las gestiona', async () => {
    const read = await ctx.request(`/api/communities/${communityId}/tasks`, {
      cookie: member.cookie,
    });
    expect(read.status).toBe(200);
    expect(((await read.json()) as Task[]).length).toBeGreaterThan(0);

    const update = await ctx.request(
      `/api/communities/${communityId}/tasks/${taskId}`,
      { method: 'PATCH', cookie: member.cookie, body: { status: 'done' } },
    );
    expect(update.status).toBe(403);

    const byOwner = await ctx.request(
      `/api/communities/${communityId}/tasks/${taskId}`,
      { method: 'PATCH', cookie: owner.cookie, body: { status: 'done' } },
    );
    expect(byOwner.status).toBe(200);

    const after = await ctx.request(`/api/communities/${communityId}/tasks`, {
      cookie: member.cookie,
    });
    const task = ((await after.json()) as Task[]).find((row) => row.id === taskId);
    expect(task?.status).toBe('done');
  });

  it('audita y permite eliminar tareas (solo admin)', async () => {
    const forbiddenRes = await ctx.request(
      `/api/communities/${communityId}/tasks/${taskId}`,
      { method: 'DELETE', cookie: member.cookie },
    );
    expect(forbiddenRes.status).toBe(403);

    const deleteRes = await ctx.request(
      `/api/communities/${communityId}/tasks/${taskId}`,
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
    expect(actions).toContain('task.created');
    expect(actions).toContain('task.updated');
    expect(actions).toContain('task.deleted');
  });
});
