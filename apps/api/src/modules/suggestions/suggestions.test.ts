import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { TestContext, TestUser } from '../../test/test-context';
import {
  createCommunityAs,
  createTestContext,
  joinCommunity,
} from '../../test/test-context';

interface Suggestion {
  id: string;
  title: string;
  status: string;
  authorId: string | null;
  authorName: string | null;
}

describe('Módulo de sugerencias', () => {
  let ctx: TestContext;
  let owner: TestUser;
  let member: TestUser;
  let resident: TestUser;
  let communityId: string;
  let suggestionId: string;

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

  it('cualquier miembro propone sugerencias', async () => {
    const res = await ctx.request(`/api/communities/${communityId}/suggestions`, {
      method: 'POST',
      cookie: member.cookie,
      body: {
        title: 'Añadir papeleras en el jardín',
        body: 'Hay basura suelta junto a los bancos del jardín.',
      },
    });
    expect(res.status).toBe(201);
    const suggestion = (await res.json()) as Suggestion;
    expect(suggestion.status).toBe('open');
    expect(suggestion.authorName).toBe('Vicente Vecino');
    suggestionId = suggestion.id;
  });

  it('solo la junta revisa el estado (y no dos veces el mismo)', async () => {
    const forbiddenRes = await ctx.request(
      `/api/communities/${communityId}/suggestions/${suggestionId}`,
      {
        method: 'PATCH',
        cookie: member.cookie,
        body: { status: 'accepted' },
      },
    );
    expect(forbiddenRes.status).toBe(403);

    const review = await ctx.request(
      `/api/communities/${communityId}/suggestions/${suggestionId}`,
      { method: 'PATCH', cookie: owner.cookie, body: { status: 'under_review' } },
    );
    expect(review.status).toBe(200);

    const repeated = await ctx.request(
      `/api/communities/${communityId}/suggestions/${suggestionId}`,
      { method: 'PATCH', cookie: owner.cookie, body: { status: 'under_review' } },
    );
    expect(repeated.status).toBe(409);

    const audit = await ctx.request(
      `/api/communities/${communityId}/audit-events?limit=20`,
      { cookie: owner.cookie },
    );
    const actions = ((await audit.json()) as Array<{ action: string }>).map(
      (event) => event.action,
    );
    expect(actions).toContain('suggestion.status_changed');
  });

  it('el autor borra la suya; otro miembro no; la junta sí', async () => {
    const mine = (await (
      await ctx.request(`/api/communities/${communityId}/suggestions`, {
        method: 'POST',
        cookie: resident.cookie,
        body: { title: 'Sugerencia de la residente', body: 'Contenido.' },
      })
    ).json()) as Suggestion;

    const byAuthor = await ctx.request(
      `/api/communities/${communityId}/suggestions/${mine.id}`,
      { method: 'DELETE', cookie: resident.cookie },
    );
    expect(byAuthor.status).toBe(200);

    const other = (await (
      await ctx.request(`/api/communities/${communityId}/suggestions`, {
        method: 'POST',
        cookie: member.cookie,
        body: { title: 'Otra sugerencia', body: 'Contenido.' },
      })
    ).json()) as Suggestion;

    const byStranger = await ctx.request(
      `/api/communities/${communityId}/suggestions/${other.id}`,
      { method: 'DELETE', cookie: resident.cookie },
    );
    expect(byStranger.status).toBe(403);

    const byAdmin = await ctx.request(
      `/api/communities/${communityId}/suggestions/${other.id}`,
      { method: 'DELETE', cookie: owner.cookie },
    );
    expect(byAdmin.status).toBe(200);
  });
});
