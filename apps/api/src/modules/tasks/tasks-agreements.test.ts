import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { TestContext, TestUser } from '../../test/test-context';
import { createCommunityAs, createTestContext } from '../../test/test-context';

interface Task {
  id: string;
  status: string;
  agreementId: string | null;
  agreementTitle: string | null;
}

interface MeetingDetail {
  id: string;
  agreements: Array<{
    id: string;
    status: string;
    linkedTask: { id: string; title: string; status: string } | null;
  }>;
}

describe('Seguimiento de acuerdos con tareas', () => {
  let ctx: TestContext;
  let owner: TestUser;
  let communityId: string;
  let meetingId: string;
  let agreementId: string;

  const scheduledFor = new Date(Date.now() + 86_400_000).toISOString();

  beforeAll(async () => {
    ctx = await createTestContext();
    owner = await ctx.signUp({
      name: 'Elena Presidenta',
      email: 'presidente@ejemplo.local',
      password: 'Password123!',
    });
    communityId = await createCommunityAs(ctx, owner);

    const meetingRes = await ctx.request(`/api/communities/${communityId}/meetings`, {
      method: 'POST',
      cookie: owner.cookie,
      body: { title: 'Junta ordinaria', scheduledFor },
    });
    meetingId = ((await meetingRes.json()) as { id: string }).id;

    const agreementRes = await ctx.request(
      `/api/communities/${communityId}/meetings/${meetingId}/agreements`,
      {
        method: 'POST',
        cookie: owner.cookie,
        body: {
          title: 'Reparar la cubierta',
          body: 'Aprobado por unanimidad por importe de 2.400 €.',
        },
      },
    );
    agreementId = ((await agreementRes.json()) as { id: string }).id;
  });

  afterAll(async () => {
    await ctx.close();
  });

  it('crea una tarea derivada del acuerdo y la enlaza', async () => {
    const res = await ctx.request(`/api/communities/${communityId}/tasks`, {
      method: 'POST',
      cookie: owner.cookie,
      body: {
        title: 'Contratar empresa de cubierta',
        dueOn: '2026-12-01',
        agreementId,
      },
    });
    expect(res.status).toBe(201);
    const task = (await res.json()) as Task;
    expect(task.agreementId).toBe(agreementId);
    expect(task.agreementTitle).toBe('Reparar la cubierta');

    const list = await ctx.request(`/api/communities/${communityId}/tasks`, {
      cookie: owner.cookie,
    });
    const rows = (await list.json()) as Task[];
    expect(rows.find((row) => row.id === task.id)?.agreementTitle).toBe(
      'Reparar la cubierta',
    );
  });

  it('el detalle de la reunión muestra la tarea del acuerdo', async () => {
    const res = await ctx.request(
      `/api/communities/${communityId}/meetings/${meetingId}`,
      { cookie: owner.cookie },
    );
    expect(res.status).toBe(200);
    const detail = (await res.json()) as MeetingDetail;
    expect(detail.agreements[0]?.linkedTask?.title).toBe(
      'Contratar empresa de cubierta',
    );
    expect(detail.agreements[0]?.linkedTask?.status).toBe('todo');

    // Avanzamos la tarea y el seguimiento lo refleja.
    const tasks = (await (
      await ctx.request(`/api/communities/${communityId}/tasks`, {
        cookie: owner.cookie,
      })
    ).json()) as Task[];
    const linked = tasks.find((task) => task.agreementId === agreementId);
    await ctx.request(`/api/communities/${communityId}/tasks/${linked?.id}`, {
      method: 'PATCH',
      cookie: owner.cookie,
      body: { status: 'done' },
    });

    const after = (await (
      await ctx.request(`/api/communities/${communityId}/meetings/${meetingId}`, {
        cookie: owner.cookie,
      })
    ).json()) as MeetingDetail;
    expect(after.agreements[0]?.linkedTask?.status).toBe('done');
  });

  it('rechaza acuerdos de otra comunidad', async () => {
    const otherCommunity = await createCommunityAs(ctx, owner, 'Comunidad Ajena');
    const meetingRes = await ctx.request(
      `/api/communities/${otherCommunity}/meetings`,
      {
        method: 'POST',
        cookie: owner.cookie,
        body: { title: 'Otra junta', scheduledFor },
      },
    );
    const otherMeeting = ((await meetingRes.json()) as { id: string }).id;
    const agreementRes = await ctx.request(
      `/api/communities/${otherCommunity}/meetings/${otherMeeting}/agreements`,
      {
        method: 'POST',
        cookie: owner.cookie,
        body: { title: 'Acuerdo ajeno', body: 'No debe usarse aquí.' },
      },
    );
    const foreignAgreement = ((await agreementRes.json()) as { id: string }).id;

    const res = await ctx.request(`/api/communities/${communityId}/tasks`, {
      method: 'POST',
      cookie: owner.cookie,
      body: { title: 'Tarea con acuerdo ajeno', agreementId: foreignAgreement },
    });
    expect(res.status).toBe(400);
  });
});
