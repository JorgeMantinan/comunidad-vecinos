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
  incidents: Array<{ title: string }>;
  tasks: Array<{ title: string }>;
  suggestions: Array<{ title: string }>;
  polls: Array<{ question: string; options: unknown[]; totalVotes: number }>;
  assets: Array<{ name: string }>;
  contracts: Array<{ provider: string }>;
  professionals: Array<{ name: string }>;
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
    await ctx.request(`/api/communities/${communityId}/incidents`, {
      method: 'POST',
      cookie: owner.cookie,
      body: { title: 'Fuga del garaje', description: 'Gotea en la pared.' },
    });
    await ctx.request(`/api/communities/${communityId}/tasks`, {
      method: 'POST',
      cookie: owner.cookie,
      body: { title: 'Revisar cubierta' },
    });
    await ctx.request(`/api/communities/${communityId}/suggestions`, {
      method: 'POST',
      cookie: owner.cookie,
      body: { title: 'Juegos en el patio', body: 'Quedaría genial.' },
    });
    await ctx.request(`/api/communities/${communityId}/polls`, {
      method: 'POST',
      cookie: owner.cookie,
      body: { question: '¿Barbacoa comunitaria?', options: ['Sí', 'No'] },
    });
    await ctx.request(`/api/communities/${communityId}/assets`, {
      method: 'POST',
      cookie: owner.cookie,
      body: { name: 'Ascensor', category: 'elevator' },
    });
    await ctx.request(`/api/communities/${communityId}/contracts`, {
      method: 'POST',
      cookie: owner.cookie,
      body: {
        provider: 'Limpiezas Norte',
        service: 'Limpieza semanal',
        amount: '200.00',
        startOn: '2026-01-01',
        renewalOn: '2027-01-01',
      },
    });
    await ctx.request(`/api/communities/${communityId}/professionals`, {
      method: 'POST',
      cookie: owner.cookie,
      body: { name: 'Fontanero Rápido', trade: 'Fontanería' },
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
    expect(payload.incidents.map((row) => row.title)).toContain('Fuga del garaje');
    expect(payload.tasks.map((row) => row.title)).toContain('Revisar cubierta');
    expect(payload.suggestions.map((row) => row.title)).toContain('Juegos en el patio');
    expect(payload.polls[0]?.options).toHaveLength(2);
    expect(payload.assets.map((row) => row.name)).toContain('Ascensor');
    expect(payload.contracts.map((row) => row.provider)).toContain('Limpiezas Norte');
    expect(payload.professionals.map((row) => row.name)).toContain('Fontanero Rápido');
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
