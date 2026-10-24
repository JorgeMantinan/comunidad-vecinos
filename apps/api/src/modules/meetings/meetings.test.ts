import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { TestContext, TestUser } from '../../test/test-context';
import {
  createCommunityAs,
  createTestContext,
  joinCommunity,
} from '../../test/test-context';

interface MeetingDetail {
  id: string;
  status: string;
  minutes: string | null;
  agenda: Array<{ id: string; position: number; title: string }>;
  agreements: Array<{ id: string; title: string; status: string }>;
}

describe('Módulo de reuniones', () => {
  let ctx: TestContext;
  let owner: TestUser;
  let member: TestUser;
  let communityId: string;
  let meetingId: string;

  const scheduledFor = new Date(Date.now() + 7 * 24 * 3600_000).toISOString();

  const detail = async (cookie: string): Promise<MeetingDetail> => {
    const res = await ctx.request(
      `/api/communities/${communityId}/meetings/${meetingId}`,
      { cookie },
    );
    expect(res.status).toBe(200);
    return (await res.json()) as MeetingDetail;
  };

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

  it('el presidente convoca una reunión (estado planned)', async () => {
    const res = await ctx.request(`/api/communities/${communityId}/meetings`, {
      method: 'POST',
      cookie: owner.cookie,
      body: {
        title: 'Junta ordinaria',
        scheduledFor,
        location: 'Salón de actos',
      },
    });
    expect(res.status).toBe(201);
    const meeting = (await res.json()) as { id: string; status: string };
    expect(meeting.status).toBe('planned');
    meetingId = meeting.id;
  });

  it('los miembros leen el detalle con orden del día y acuerdos', async () => {
    const body = await detail(member.cookie);
    expect(body.agenda).toEqual([]);
    expect(body.agreements).toEqual([]);
  });

  it('un propietario no puede gestionar reuniones ni su orden del día', async () => {
    const create = await ctx.request(`/api/communities/${communityId}/meetings`, {
      method: 'POST',
      cookie: member.cookie,
      body: { title: 'Otra junta', scheduledFor },
    });
    expect(create.status).toBe(403);

    const agenda = await ctx.request(
      `/api/communities/${communityId}/meetings/${meetingId}/agenda`,
      { method: 'POST', cookie: member.cookie, body: { title: 'Punto' } },
    );
    expect(agenda.status).toBe(403);
  });

  it('el orden del día se añade y se respeta el orden', async () => {
    for (const title of ['Aprobación de acta', 'Cuentas del trimestre']) {
      const res = await ctx.request(
        `/api/communities/${communityId}/meetings/${meetingId}/agenda`,
        { method: 'POST', cookie: owner.cookie, body: { title } },
      );
      expect(res.status).toBe(201);
    }

    const body = await detail(member.cookie);
    expect(body.agenda.map((item) => item.title)).toEqual([
      'Aprobación de acta',
      'Cuentas del trimestre',
    ]);
    expect(body.agenda.map((item) => item.position)).toEqual([1, 2]);
  });

  it('permite editar y eliminar puntos del orden del día', async () => {
    const body = await detail(owner.cookie);
    const [first] = body.agenda;
    expect(first).toBeDefined();

    const edit = await ctx.request(
      `/api/communities/${communityId}/meetings/${meetingId}/agenda/${first?.id}`,
      {
        method: 'PATCH',
        cookie: owner.cookie,
        body: { title: 'Aprobación de actas anteriores' },
      },
    );
    expect(edit.status).toBe(200);

    const remove = await ctx.request(
      `/api/communities/${communityId}/meetings/${meetingId}/agenda/${first?.id}`,
      { method: 'DELETE', cookie: owner.cookie },
    );
    expect(remove.status).toBe(200);

    const after = await detail(member.cookie);
    expect(after.agenda.map((item) => item.title)).not.toContain(
      'Aprobación de actas anteriores',
    );
  });

  it('recoge acuerdos con sus estados y los audita', async () => {
    const createRes = await ctx.request(
      `/api/communities/${communityId}/meetings/${meetingId}/agreements`,
      {
        method: 'POST',
        cookie: owner.cookie,
        body: {
          title: 'Contratar empresa de limpieza',
          body: 'Se contrata a Limpiezas Norte SL por 480 €/mes.',
        },
      },
    );
    expect(createRes.status).toBe(201);
    const agreement = (await createRes.json()) as { id: string; status: string };
    expect(agreement.status).toBe('proposed');

    const approve = await ctx.request(
      `/api/communities/${communityId}/meetings/${meetingId}/agreements/${agreement.id}`,
      { method: 'PATCH', cookie: owner.cookie, body: { status: 'approved' } },
    );
    expect(approve.status).toBe(200);

    const body = await detail(member.cookie);
    expect(body.agreements[0]?.status).toBe('approved');

    const audit = await ctx.request(
      `/api/communities/${communityId}/audit-events?limit=50`,
      { cookie: owner.cookie },
    );
    const actions = ((await audit.json()) as Array<{ action: string }>).map(
      (event) => event.action,
    );
    expect(actions).toContain('meeting.created');
    expect(actions).toContain('agenda.item_added');
    expect(actions).toContain('agreement.created');
    expect(actions).toContain('agreement.status_changed');
  });

  it('permite guardar el acta y finalizar la reunión', async () => {
    const res = await ctx.request(
      `/api/communities/${communityId}/meetings/${meetingId}`,
      {
        method: 'PATCH',
        cookie: owner.cookie,
        body: {
          status: 'finished',
          minutes: 'Se aprueban las cuentas por unanimidad.',
        },
      },
    );
    expect(res.status).toBe(200);

    const body = await detail(member.cookie);
    expect(body.status).toBe('finished');
    expect(body.minutes).toContain('por unanimidad');
  });

  it('aisla las reuniones entre comunidades (404 manipulando IDs)', async () => {
    const stranger = await ctx.signUp({
      name: 'Malo Maloso',
      email: 'intruso@ejemplo.local',
      password: 'Password123!',
    });
    const res = await ctx.request(
      `/api/communities/${communityId}/meetings/${meetingId}`,
      { cookie: stranger.cookie },
    );
    expect(res.status).toBe(404);
  });
});
