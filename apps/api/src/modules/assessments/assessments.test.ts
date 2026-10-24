import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { TestContext, TestUser } from '../../test/test-context';
import {
  createCommunityAs,
  createTestContext,
  joinCommunity,
} from '../../test/test-context';
import { distributeCents } from './service';

interface AssessmentDetail {
  id: string;
  concept: string;
  totalAmount: string;
  charges: Array<{
    id: string;
    unitId: string;
    unitNumber: string;
    amount: string;
    status: string;
    paidOn: string | null;
  }>;
}

const sum = (values: string[]): number =>
  values.reduce((total, value) => total + Math.round(Number(value) * 100), 0);

describe('distributeCents', () => {
  it('reparte el total de forma exacta (céntimos) por coeficiente', () => {
    const amounts = distributeCents(['1', '0.5', '1.5'], '100.00');
    expect(amounts).toHaveLength(3);
    expect(sum(amounts)).toBe(10_000);
    // Proporción: 1/3, 1/6 y 1/2 de 100 € (con redondeo exacto en céntimos)
    expect(amounts[0]).toBe('33.33');
    expect(amounts[1]).toBe('16.67');
    expect(amounts[2]).toBe('50.00');
  });

  it('da al menos un céntimo a cada unidad y suma exacta', () => {
    const amounts = distributeCents(Array(30).fill('1'), '0.40');
    expect(amounts).toHaveLength(30);
    expect(amounts.every((amount) => Number(amount) >= 0.01)).toBe(true);
    expect(sum(amounts)).toBe(40);
  });

  it('rechaza importes demasiado pequeños', () => {
    expect(() => distributeCents(['1', '1'], '0.01')).toThrow(/demasiado pequeño/);
  });
});

describe('Módulo de derramas', () => {
  let ctx: TestContext;
  let owner: TestUser;
  let member: TestUser;
  let resident: TestUser;
  let communityId: string;
  let assessmentId: string;

  const createAssessment = (
    cookie: string,
    body: Record<string, unknown>,
  ): Promise<Response> =>
    ctx.request(`/api/communities/${communityId}/assessments`, {
      method: 'POST',
      cookie,
      body,
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

    for (const number of ['1ºA', '2ºB', '3ºC']) {
      const res = await ctx.request(`/api/communities/${communityId}/units`, {
        method: 'POST',
        cookie: owner.cookie,
        body: { number, coefficient: '1' },
      });
      expect(res.status).toBe(201);
    }
  });

  afterAll(async () => {
    await ctx.close();
  });

  it('no permite derramas sin unidades', async () => {
    const emptyCommunity = await createCommunityAs(
      ctx,
      owner,
      'Comunidad sin unidades',
    );
    const res = await ctx.request(`/api/communities/${emptyCommunity}/assessments`, {
      method: 'POST',
      cookie: owner.cookie,
      body: { concept: 'Derrama sin unidades', totalAmount: '90.00' },
    });
    expect(res.status).toBe(409);
  });

  it('la residente no accede y un propietario no puede crear', async () => {
    const readResident = await ctx.request(
      `/api/communities/${communityId}/assessments`,
      { cookie: resident.cookie },
    );
    expect(readResident.status).toBe(403);

    const createMember = await createAssessment(member.cookie, {
      concept: 'Derrama de miembros',
      totalAmount: '60.00',
    });
    expect(createMember.status).toBe(403);
  });

  it('reparte el importe entre las unidades con suma exacta', async () => {
    const res = await createAssessment(owner.cookie, {
      concept: 'Derrama de cubierta',
      totalAmount: '120.00',
    });
    expect(res.status).toBe(201);
    const detail = (await res.json()) as AssessmentDetail;
    assessmentId = detail.id;

    expect(detail.charges).toHaveLength(3);
    expect(detail.charges.every((charge) => Number(charge.amount) > 0)).toBe(true);
    expect(sum(detail.charges.map((charge) => charge.amount))).toBe(12_000);
    expect(detail.charges.every((charge) => charge.status === 'pending')).toBe(true);
  });

  it('permite pagar cuotas individualmente (una sola vez)', async () => {
    const detail = (await (
      await ctx.request(`/api/communities/${communityId}/assessments/${assessmentId}`, {
        cookie: member.cookie,
      })
    ).json()) as AssessmentDetail;
    const charge = detail.charges[0];
    expect(charge).toBeDefined();

    const pay = await ctx.request(
      `/api/communities/${communityId}/assessments/${assessmentId}/charges/${charge?.id}/pay`,
      { method: 'POST', cookie: owner.cookie, body: {} },
    );
    expect(pay.status).toBe(200);

    const after = (await (
      await ctx.request(`/api/communities/${communityId}/assessments/${assessmentId}`, {
        cookie: member.cookie,
      })
    ).json()) as AssessmentDetail;
    const paid = after.charges.find((row) => row.id === charge?.id);
    expect(paid?.status).toBe('paid');
    expect(paid?.paidOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const repeat = await ctx.request(
      `/api/communities/${communityId}/assessments/${assessmentId}/charges/${charge?.id}/pay`,
      { method: 'POST', cookie: owner.cookie, body: {} },
    );
    expect(repeat.status).toBe(409);
  });

  it('una cuota solo se paga a través de su derrama (404 cruzado)', async () => {
    const first = (await (
      await ctx.request(`/api/communities/${communityId}/assessments/${assessmentId}`, {
        cookie: owner.cookie,
      })
    ).json()) as AssessmentDetail;

    const secondRes = await createAssessment(owner.cookie, {
      concept: 'Derrama de jardinería',
      totalAmount: '30.00',
    });
    const second = (await secondRes.json()) as AssessmentDetail;

    const res = await ctx.request(
      `/api/communities/${communityId}/assessments/${second.id}/charges/${first.charges[1]?.id}/pay`,
      { method: 'POST', cookie: owner.cookie, body: {} },
    );
    expect(res.status).toBe(404);
  });

  it('impide eliminar unidades con derramas registradas', async () => {
    const units = (await (
      await ctx.request(`/api/communities/${communityId}/units`, {
        cookie: owner.cookie,
      })
    ).json()) as Array<{ id: string; number: string }>;

    const res = await ctx.request(
      `/api/communities/${communityId}/units/${units[0]?.id}`,
      { method: 'DELETE', cookie: owner.cookie },
    );
    expect(res.status).toBe(409);
  });

  it('audita la creación de derramas y los pagos', async () => {
    const audit = await ctx.request(
      `/api/communities/${communityId}/audit-events?limit=50`,
      { cookie: owner.cookie },
    );
    const actions = ((await audit.json()) as Array<{ action: string }>).map(
      (event) => event.action,
    );
    expect(actions).toContain('assessment.created');
    expect(actions).toContain('assessment.charge_paid');
  });
});
