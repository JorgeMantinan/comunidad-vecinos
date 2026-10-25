import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { TestContext, TestUser } from '../../test/test-context';
import {
  createCommunityAs,
  createTestContext,
  joinCommunity,
} from '../../test/test-context';

interface Sponsorship {
  id: string;
  businessName: string;
  status: string;
  monthlyAmount: string | null;
  communityIds: string[];
}

describe('Patrocinios (publicidad de plataforma)', () => {
  let ctx: TestContext;
  let platformAdmin: TestUser;
  let owner: TestUser;
  let member: TestUser;
  let communityId: string;
  let sponsorshipId: string;

  const previousEmails = process.env.PLATFORM_ADMIN_EMAILS;

  beforeAll(async () => {
    process.env.PLATFORM_ADMIN_EMAILS = 'plataforma@ejemplo.local';
    ctx = await createTestContext();
    platformAdmin = await ctx.signUp({
      name: 'Operador de Plataforma',
      email: 'plataforma@ejemplo.local',
      password: 'Password123!',
    });
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
    communityId = await createCommunityAs(ctx, owner, 'Comunidad con anunciantes');
    await joinCommunity(ctx, communityId, owner, member, 'member');
  });

  afterAll(async () => {
    if (previousEmails === undefined) {
      delete process.env.PLATFORM_ADMIN_EMAILS;
    } else {
      process.env.PLATFORM_ADMIN_EMAILS = previousEmails;
    }
    await ctx.close();
  });

  it('solo la administración de plataforma accede a la gestión', async () => {
    const unauth = await ctx.request('/api/platform/sponsorships');
    expect(unauth.status).toBe(401);

    const forbidden = await ctx.request('/api/platform/sponsorships', {
      cookie: owner.cookie,
    });
    expect(forbidden.status).toBe(403);
  });

  it('crea un patrocinio con sus comunidades asignadas', async () => {
    const res = await ctx.request('/api/platform/sponsorships', {
      method: 'POST',
      cookie: platformAdmin.cookie,
      body: {
        businessName: 'Panadería del Barrio',
        website: 'https://panaderia.example.com',
        monthlyAmount: '120.00',
        communityIds: [communityId],
      },
    });
    expect(res.status).toBe(201);
    const sponsorship = (await res.json()) as Sponsorship;
    expect(sponsorship.status).toBe('pending');
    expect(sponsorship.communityIds).toEqual([communityId]);
    sponsorshipId = sponsorship.id;
  });

  it('rechaza comunidades inexistentes y webs con esquemas inseguros', async () => {
    const res = await ctx.request('/api/platform/sponsorships', {
      method: 'POST',
      cookie: platformAdmin.cookie,
      body: {
        businessName: 'Raro',
        communityIds: ['cm_00000000000000000000000000000000'],
      },
    });
    expect(res.status).toBe(400);

    // javascript: en un href sería XSS al hacer clic.
    const unsafeWebsite = await ctx.request('/api/platform/sponsorships', {
      method: 'POST',
      cookie: platformAdmin.cookie,
      body: {
        businessName: 'Sitio Raro',
        website: 'javascript:alert(1)',
        communityIds: [communityId],
      },
    });
    expect(unsafeWebsite.status).toBe(400);
  });

  it('la comunidad solo ve publicidad activa, identificada y sin datos privados', async () => {
    const before = await ctx.request(`/api/communities/${communityId}/sponsorships`, {
      cookie: member.cookie,
    });
    expect(before.status).toBe(200);
    expect(await before.json()).toEqual([]); // pendiente => no visible

    const activate = await ctx.request(`/api/platform/sponsorships/${sponsorshipId}`, {
      method: 'PATCH',
      cookie: platformAdmin.cookie,
      body: { status: 'active' },
    });
    expect(activate.status).toBe(200);

    const after = await ctx.request(`/api/communities/${communityId}/sponsorships`, {
      cookie: member.cookie,
    });
    expect(after.status).toBe(200);
    const sponsors = (await after.json()) as Array<Record<string, unknown>>;
    expect(sponsors).toHaveLength(1);
    expect(sponsors[0]?.advertising).toBe(true);
    expect(sponsors[0]?.businessName).toBe('Panadería del Barrio');

    // Nunca se expone el importe, el contacto ni dato interno.
    expect(Object.keys(sponsors[0] ?? {}).sort()).toEqual([
      'advertising',
      'businessName',
      'id',
      'website',
    ]);
    expect(JSON.stringify(sponsors)).not.toContain('120.00');
  });

  it('la auditoría de la comunidad refleja la publicidad', async () => {
    const audit = await ctx.request(
      `/api/communities/${communityId}/audit-events?limit=20`,
      { cookie: owner.cookie },
    );
    const actions = ((await audit.json()) as Array<{ action: string }>).map(
      (event) => event.action,
    );
    expect(actions).toContain('sponsorship.created');
    expect(actions).toContain('sponsorship.updated');
  });

  it('el patrocinio finalizado desaparece de la comunidad', async () => {
    await ctx.request(`/api/platform/sponsorships/${sponsorshipId}`, {
      method: 'PATCH',
      cookie: platformAdmin.cookie,
      body: { status: 'ended' },
    });
    const after = await ctx.request(`/api/communities/${communityId}/sponsorships`, {
      cookie: member.cookie,
    });
    expect(await after.json()).toEqual([]);
  });
});
