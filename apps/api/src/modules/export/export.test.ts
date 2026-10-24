import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { TestContext, TestUser } from '../../test/test-context';
import {
  createCommunityAs,
  createTestContext,
  joinCommunity,
} from '../../test/test-context';

interface ExportPayload {
  format: string;
  exportedAt: string;
  community: { id: string; name: string };
  members: Array<{ email: string }>;
  units: Array<{ number: string }>;
  announcements: Array<{ title: string }>;
  meetings: Array<{ title: string; agenda: unknown[]; agreements: unknown[] }>;
  expenses: Array<{ concept: string }>;
  invoices: Array<{ number: string }>;
  assessments: Array<{ concept: string; charges: unknown[] }>;
}

describe('Exportación de datos de la comunidad', () => {
  let ctx: TestContext;
  let owner: TestUser;
  let member: TestUser;
  let communityId: string;

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
    communityId = await createCommunityAs(ctx, owner, 'Comunidad Exportable');
    await joinCommunity(ctx, communityId, owner, member, 'member');

    await ctx.request(`/api/communities/${communityId}/announcements`, {
      method: 'POST',
      cookie: owner.cookie,
      body: { title: 'Aviso de exportación', body: 'Contenido del aviso.' },
    });
    await ctx.request(`/api/communities/${communityId}/units`, {
      method: 'POST',
      cookie: owner.cookie,
      body: { number: '1ºA', coefficient: '1' },
    });
    await ctx.request(`/api/communities/${communityId}/expenses`, {
      method: 'POST',
      cookie: owner.cookie,
      body: {
        concept: 'Agua',
        amount: '55.20',
        category: 'supply',
        incurredOn: '2026-10-05',
      },
    });
    await ctx.request(`/api/communities/${communityId}/invoices`, {
      method: 'POST',
      cookie: owner.cookie,
      body: {
        number: 'F-9',
        supplier: 'Distribuciones SL',
        amount: '19.99',
        issuedOn: '2026-10-06',
      },
    });
    await ctx.request(`/api/communities/${communityId}/assessments`, {
      method: 'POST',
      cookie: owner.cookie,
      body: { concept: 'Derrama de prueba', totalAmount: '40.00' },
    });
  });

  afterAll(async () => {
    await ctx.close();
  });

  it('solo owner/admin pueden exportar', async () => {
    const res = await ctx.request(`/api/communities/${communityId}/export`, {
      cookie: member.cookie,
    });
    expect(res.status).toBe(403);
  });

  it('devuelve un JSON descargable con todos los módulos', async () => {
    const res = await ctx.request(`/api/communities/${communityId}/export`, {
      cookie: owner.cookie,
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/json');
    expect(res.headers.get('content-disposition')).toContain('attachment');

    const payload = (await res.json()) as ExportPayload;
    expect(payload.format).toBe('comunidad-vecinos/export-v1');
    expect(payload.community.name).toBe('Comunidad Exportable');
    expect(payload.members.map((row) => row.email)).toContain('vecino@ejemplo.local');
    expect(payload.units.map((row) => row.number)).toContain('1ºA');
    expect(payload.announcements.map((row) => row.title)).toContain(
      'Aviso de exportación',
    );
    expect(payload.expenses.map((row) => row.concept)).toContain('Agua');
    expect(payload.invoices.map((row) => row.number)).toContain('F-9');
    expect(payload.assessments[0]?.charges).toHaveLength(1);
    expect(payload.meetings).toEqual([]);
  });

  it('no exporta datos de otras comunidades', async () => {
    const other = await createCommunityAs(ctx, owner, 'Comunidad Ajena');
    const res = await ctx.request(`/api/communities/${other}/export`, {
      cookie: owner.cookie,
    });
    const payload = (await res.json()) as ExportPayload;
    expect(payload.community.name).toBe('Comunidad Ajena');
    expect(payload.expenses).toEqual([]);
    expect(payload.invoices).toEqual([]);
  });
});
