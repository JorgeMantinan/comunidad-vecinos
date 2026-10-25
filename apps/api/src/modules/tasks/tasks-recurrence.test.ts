import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { TestContext, TestUser } from '../../test/test-context';
import { createCommunityAs, createTestContext } from '../../test/test-context';

interface Task {
  id: string;
  title: string;
  status: string;
  dueOn: string | null;
  recurrence: string | null;
}

describe('Procesos repetitivos (tareas recurrentes)', () => {
  let ctx: TestContext;
  let owner: TestUser;
  let communityId: string;

  const createTask = (body: Record<string, unknown>): Promise<Response> =>
    ctx.request(`/api/communities/${communityId}/tasks`, {
      method: 'POST',
      cookie: owner.cookie,
      body,
    });

  const listTasks = async (): Promise<Task[]> => {
    const res = await ctx.request(`/api/communities/${communityId}/tasks`, {
      cookie: owner.cookie,
    });
    return (await res.json()) as Task[];
  };

  const markDone = (taskId: string): Promise<Response> =>
    ctx.request(`/api/communities/${communityId}/tasks/${taskId}`, {
      method: 'PATCH',
      cookie: owner.cookie,
      body: { status: 'done' },
    });

  beforeAll(async () => {
    ctx = await createTestContext();
    owner = await ctx.signUp({
      name: 'Elena Presidenta',
      email: 'presidente@ejemplo.local',
      password: 'Password123!',
    });
    communityId = await createCommunityAs(ctx, owner);
  });

  afterAll(async () => {
    await ctx.close();
  });

  it('al completar una tarea mensual nace la siguiente ocurrencia', async () => {
    const create = await createTask({
      title: 'Revisar bomba de cisterna',
      dueOn: '2026-01-31',
      recurrence: 'monthly',
    });
    expect(create.status).toBe(201);
    const task = (await create.json()) as Task;
    expect(task.recurrence).toBe('monthly');

    const done = await markDone(task.id);
    expect(done.status).toBe(200);

    const tasks = await listTasks();
    expect(tasks).toHaveLength(2);

    const next = tasks.find((row) => row.id !== task.id);
    expect(next?.title).toBe('Revisar bomba de cisterna');
    expect(next?.status).toBe('todo');
    expect(next?.recurrence).toBe('monthly');
    // 31 enero + 1 mes → JavaScript normaliza al último día de febrero.
    expect(next?.dueOn).toBe('2026-02-28');
  });

  it('no se duplica si se marca como hecha dos veces', async () => {
    const before = await listTasks();
    const target = before.find((task) => task.status === 'done');
    expect(target).toBeDefined();

    await markDone(target!.id); // ya estaba hecha: no debe spawnear
    const after = await listTasks();
    expect(after).toHaveLength(before.length);
  });

  it('las tareas no recurrentes no generan ocurrencias', async () => {
    const create = await createTask({
      title: 'Pintar el rellano',
      dueOn: '2026-06-01',
    });
    const task = (await create.json()) as Task;
    expect(task.recurrence).toBeNull();

    const before = (await listTasks()).length;
    await markDone(task.id);
    const after = await listTasks();
    expect(after).toHaveLength(before);
  });

  it('registra la recurrencia en la auditoría', async () => {
    const audit = await ctx.request(
      `/api/communities/${communityId}/audit-events?limit=50`,
      { cookie: owner.cookie },
    );
    const actions = ((await audit.json()) as Array<{ action: string }>).map(
      (event) => event.action,
    );
    expect(actions).toContain('task.recurred');
  });

  it('valida los valores de recurrencia con Zod', async () => {
    const res = await createTask({
      title: 'Recurrencia inválida',
      recurrence: 'weekly',
    });
    expect(res.status).toBe(400);
  });
});
