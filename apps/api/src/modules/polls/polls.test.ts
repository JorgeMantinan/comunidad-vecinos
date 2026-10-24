import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { TestContext, TestUser } from '../../test/test-context';
import {
  createCommunityAs,
  createTestContext,
  joinCommunity,
} from '../../test/test-context';

interface PollDetail {
  id: string;
  status: string;
  totalVotes: number;
  options: Array<{ id: string; text: string; votes: number }>;
  myVoteOptionId: string | null;
}

describe('Módulo de encuestas', () => {
  let ctx: TestContext;
  let owner: TestUser;
  let member: TestUser;
  let resident: TestUser;
  let communityId: string;
  let pollId: string;
  let firstOptionId: string;
  let secondOptionId: string;

  const createPoll = (cookie: string, body: unknown): Promise<Response> =>
    ctx.request(`/api/communities/${communityId}/polls`, {
      method: 'POST',
      cookie,
      body,
    });

  const detail = async (cookie: string): Promise<PollDetail> => {
    const res = await ctx.request(`/api/communities/${communityId}/polls/${pollId}`, {
      cookie,
    });
    expect(res.status).toBe(200);
    return (await res.json()) as PollDetail;
  };

  const vote = (cookie: string, optionId: string): Promise<Response> =>
    ctx.request(`/api/communities/${communityId}/polls/${pollId}/vote`, {
      method: 'POST',
      cookie,
      body: { optionId },
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

  it('solo owner/admin crean encuestas y validan las opciones', async () => {
    const byMember = await createPoll(member.cookie, {
      question: '¿Pregunta de miembro?',
      options: ['Sí', 'No'],
    });
    expect(byMember.status).toBe(403);

    const duplicated = await createPoll(owner.cookie, {
      question: '¿Opciones duplicadas?',
      options: ['Sí', 'Sí'],
    });
    expect(duplicated.status).toBe(400);

    const tooFew = await createPoll(owner.cookie, {
      question: '¿Pocas opciones?',
      options: ['Única'],
    });
    expect(tooFew.status).toBe(400);
  });

  it('la junta crea una encuesta con sus opciones', async () => {
    const res = await createPoll(owner.cookie, {
      question: '¿Colocar péndolas en el patio?',
      options: ['Sí, en primavera', 'No', 'Dejarlo para más adelante'],
    });
    expect(res.status).toBe(201);
    const poll = (await res.json()) as PollDetail;
    expect(poll.status).toBe('open');
    expect(poll.totalVotes).toBe(0);
    expect(poll.options.map((option) => option.votes)).toEqual([0, 0, 0]);
    pollId = poll.id;
    firstOptionId = poll.options[0]?.id ?? '';
    secondOptionId = poll.options[1]?.id ?? '';
  });

  it('cualquier miembro vota una sola vez y los recuentos son correctos', async () => {
    const firstVote = await vote(member.cookie, firstOptionId);
    expect(firstVote.status).toBe(200);
    const afterFirst = (await firstVote.json()) as PollDetail;
    expect(afterFirst.totalVotes).toBe(1);
    expect(afterFirst.myVoteOptionId).toBe(firstOptionId);

    const repeated = await vote(member.cookie, secondOptionId);
    expect(repeated.status).toBe(409);

    // La residente también puede votar (cualquier miembro).
    const residentVote = await vote(resident.cookie, firstOptionId);
    expect(residentVote.status).toBe(200);

    const body = await detail(owner.cookie);
    expect(body.totalVotes).toBe(2);
    expect(body.options.find((option) => option.id === firstOptionId)?.votes).toBe(2);
  });

  it('rechaza opciones de otra encuesta', async () => {
    const otherRes = await createPoll(owner.cookie, {
      question: '¿Otra pregunta?',
      options: ['A', 'B'],
    });
    const other = (await otherRes.json()) as PollDetail;
    const foreignOption = other.options[0]?.id ?? '';

    const fresh = await createPoll(owner.cookie, {
      question: '¿Tercera pregunta?',
      options: ['X', 'Y'],
    });
    const freshPoll = (await fresh.json()) as PollDetail;
    pollId = freshPoll.id;

    const res = await vote(owner.cookie, foreignOption);
    expect(res.status).toBe(404);

    pollId = other.id;
    await vote(owner.cookie, foreignOption); // limpieza de estado para el cierre
  });

  it('el cierre impide votar (solo owner/admin cierran)', async () => {
    const byMember = await ctx.request(
      `/api/communities/${communityId}/polls/${pollId}/close`,
      { method: 'POST', cookie: member.cookie },
    );
    expect(byMember.status).toBe(403);

    const close = await ctx.request(
      `/api/communities/${communityId}/polls/${pollId}/close`,
      { method: 'POST', cookie: owner.cookie },
    );
    expect(close.status).toBe(200);

    const detailBody = await detail(member.cookie);
    expect(detailBody.status).toBe('closed');

    const voteAfterClose = await vote(resident.cookie, firstOptionId);
    expect(voteAfterClose.status).toBe(409);

    const audit = await ctx.request(
      `/api/communities/${communityId}/audit-events?limit=30`,
      { cookie: owner.cookie },
    );
    const actions = ((await audit.json()) as Array<{ action: string }>).map(
      (event) => event.action,
    );
    expect(actions).toContain('poll.created');
    expect(actions).toContain('poll.closed');
  });
});
