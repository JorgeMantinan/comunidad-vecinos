import type { FeeChargeView, FeeTariffView, UnitView } from '@comunidad/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { TestContext, TestUser } from '../../test/test-context';
import {
  createCommunityAs,
  createTestContext,
  joinCommunity,
} from '../../test/test-context';

const PASSWORD = 'Password123!';
const currentPeriod = (): string => new Date().toISOString().slice(0, 7);

/** Periodo siguiente al actual (AAAA-MM). */
function nextPeriod(): string {
  const [year, month] = currentPeriod().split('-').map(Number);
  if (!year || !month) {
    throw new Error('Periodo inválido');
  }
  // `month` es 1-12 y Date.UTC espera 0-11: al pasar `month` como
  // índice resulta exactamente el mes siguiente.
  return new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 7);
}

describe('Cuotas y tasas (garaje, trastero…)', () => {
  let ctx: TestContext;
  let owner: TestUser;
  let member: TestUser;
  let resident: TestUser;
  let communityId: string;
  let otherCommunityId: string;

  const post = (path: string, body: unknown, cookie = owner.cookie) =>
    ctx.request(path, { method: 'POST', cookie, body });

  const createUnit = (
    number: string,
    kind: string,
    coefficient = '1',
    cookie = owner.cookie,
  ) =>
    post(
      `/api/communities/${communityId}/units`,
      {
        number,
        coefficient,
        kind,
        portal: 'Único',
      },
      cookie,
    );

  beforeAll(async () => {
    ctx = await createTestContext();
    owner = await ctx.signUp({
      name: 'Elena Presidenta',
      email: 'presidente@ejemplo.local',
      password: PASSWORD,
    });
    member = await ctx.signUp({
      name: 'Vicente Vecino',
      email: 'vecino@ejemplo.local',
      password: PASSWORD,
    });
    resident = await ctx.signUp({
      name: 'Nuria Residente',
      email: 'residente@ejemplo.local',
      password: PASSWORD,
    });

    communityId = await createCommunityAs(ctx, owner, 'Comunidad de cuotas');
    await joinCommunity(ctx, communityId, owner, member, 'member');
    await joinCommunity(ctx, communityId, owner, resident, 'resident');
    otherCommunityId = await createCommunityAs(ctx, member, 'Comunidad ajena');

    expect((await createUnit('1ºA', 'vivienda')).status).toBe(201);
    expect((await createUnit('G-1', 'garaje', '0.1')).status).toBe(201);
    expect((await createUnit('T-1', 'trastero', '0.05')).status).toBe(201);
  });

  afterAll(async () => {
    await ctx.close();
  });

  it('la residente no ve la información económica (403)', async () => {
    const tariffs = await ctx.request(`/api/communities/${communityId}/fee-tariffs`, {
      cookie: resident.cookie,
    });
    expect(tariffs.status).toBe(403);

    const charges = await ctx.request(`/api/communities/${communityId}/fee-charges`, {
      cookie: resident.cookie,
    });
    expect(charges.status).toBe(403);
  });

  it('un miembro ve las cuotas pero no puede gestionarlas (403)', async () => {
    const list = await ctx.request(`/api/communities/${communityId}/fee-tariffs`, {
      cookie: member.cookie,
    });
    expect(list.status).toBe(200);

    const create = await post(
      `/api/communities/${communityId}/fee-tariffs`,
      { concept: 'Intento de vecino', amount: '10.00' },
      member.cookie,
    );
    expect(create.status).toBe(403);

    const generate = await post(
      `/api/communities/${communityId}/fee-charges/generate`,
      { period: currentPeriod() },
      member.cookie,
    );
    expect(generate.status).toBe(403);
  });

  it('la comunidad no ve las cuotas de otra comunidad (404)', async () => {
    const res = await ctx.request(
      `/api/communities/${communityId}/fee-charges?period=${currentPeriod()}`,
      { cookie: member.cookie },
    );
    expect(res.status).toBe(200);

    const ajena = await ctx.request(
      `/api/communities/${otherCommunityId}/fee-charges?period=${currentPeriod()}`,
      { cookie: member.cookie },
    );
    expect(ajena.status).toBe(200);
    expect(await ajena.json()).toEqual([]);
  });

  it('crea la cuota ordinaria, genera el periodo y la cobra', async () => {
    const created = await post(`/api/communities/${communityId}/fee-tariffs`, {
      concept: 'Cuota ordinaria',
      amount: '85.00',
      target: 'all',
      frequency: 'monthly',
    });
    expect(created.status).toBe(201);
    const tariff = (await created.json()) as FeeTariffView;
    expect(tariff.target).toBe('all');
    expect(tariff.frequency).toBe('monthly');
    expect(tariff.anchorPeriod).toBe(currentPeriod());

    const generate = await post(
      `/api/communities/${communityId}/fee-charges/generate`,
      { period: currentPeriod() },
    );
    expect(generate.status).toBe(200);
    expect(await generate.json()).toEqual({
      period: currentPeriod(),
      generated: 3, // una por unidad: vivienda, garaje y trastero
      alreadyRegistered: 0,
    });

    const list = await ctx.request(
      `/api/communities/${communityId}/fee-charges?period=${currentPeriod()}`,
      { cookie: owner.cookie },
    );
    const charges = (await list.json()) as FeeChargeView[];
    expect(charges).toHaveLength(3);
    expect(charges.every((charge) => charge.status === 'pending')).toBe(true);
    expect(charges.map((charge) => charge.concept)).toEqual([
      'Cuota ordinaria',
      'Cuota ordinaria',
      'Cuota ordinaria',
    ]);

    // Cobrar una unidad.
    const target = charges[0];
    expect(target).toBeDefined();
    const pay = await ctx.request(
      `/api/communities/${communityId}/fee-charges/${target?.id}`,
      { method: 'PATCH', cookie: owner.cookie, body: { status: 'paid' } },
    );
    expect(pay.status).toBe(200);

    const after = (await (
      await ctx.request(
        `/api/communities/${communityId}/fee-charges?period=${currentPeriod()}`,
        { cookie: owner.cookie },
      )
    ).json()) as FeeChargeView[];
    const paid = after.find((charge) => charge.id === target?.id);
    expect(paid?.status).toBe('paid');
    expect(paid?.paidOn).toBe(new Date().toISOString().slice(0, 10));
  });

  it('regenerar el periodo no duplica ni paga dos veces', async () => {
    const again = await post(`/api/communities/${communityId}/fee-charges/generate`, {
      period: currentPeriod(),
    });
    expect(again.status).toBe(200);
    expect(await again.json()).toEqual({
      period: currentPeriod(),
      generated: 0,
      alreadyRegistered: 3,
    });

    const list = (await (
      await ctx.request(
        `/api/communities/${communityId}/fee-charges?period=${currentPeriod()}`,
        { cookie: owner.cookie },
      )
    ).json()) as FeeChargeView[];
    expect(list).toHaveLength(3);
    expect(list.filter((charge) => charge.status === 'paid')).toHaveLength(1);
  });

  it('la tasa de garaje solo se aplica a las plazas de garaje', async () => {
    const created = await post(`/api/communities/${communityId}/fee-tariffs`, {
      concept: 'Tasa de garaje',
      amount: '25.00',
      target: 'garaje',
      frequency: 'monthly',
    });
    expect(created.status).toBe(201);

    await post(`/api/communities/${communityId}/fee-charges/generate`, {
      period: currentPeriod(),
    });

    const list = (await (
      await ctx.request(
        `/api/communities/${communityId}/fee-charges?period=${currentPeriod()}`,
        { cookie: owner.cookie },
      )
    ).json()) as FeeChargeView[];
    const garaje = list.filter((charge) => charge.concept === 'Tasa de garaje');
    expect(garaje).toHaveLength(1);
    expect(garaje[0]?.unitNumber).toBe('G-1');
    expect(garaje[0]?.amount).toBe('25.00');
    // La cuota ordinaria sigue cubriendo a las tres unidades.
    expect(list.filter((charge) => charge.concept === 'Cuota ordinaria')).toHaveLength(
      3,
    );
  });

  it('la periodicidad trimestral no genera todos los meses', async () => {
    const created = await post(`/api/communities/${communityId}/fee-tariffs`, {
      concept: 'Cuota de agua trimestral',
      amount: '40.00',
      target: 'all',
      frequency: 'quarterly',
    });
    expect(created.status).toBe(201);

    // El mes siguiente al ancla: las mensuales sí se generan y la
    // trimestral no (diff = 1, no múltiplo de 3).
    const next = nextPeriod();
    const generate = await post(
      `/api/communities/${communityId}/fee-charges/generate`,
      { period: next },
    );
    expect(generate.status).toBe(200);

    const list = (await (
      await ctx.request(`/api/communities/${communityId}/fee-charges?period=${next}`, {
        cookie: owner.cookie,
      })
    ).json()) as FeeChargeView[];
    expect(list.map((charge) => charge.concept)).toContain('Cuota ordinaria');
    expect(list.map((charge) => charge.concept)).toContain('Tasa de garaje');
    expect(list.map((charge) => charge.concept)).not.toContain(
      'Cuota de agua trimestral',
    );
  });

  it('rechaza importes inválidos y periodos mal formados', async () => {
    const badAmount = await post(`/api/communities/${communityId}/fee-tariffs`, {
      concept: 'Cuota rara',
      amount: 'no-numero',
    });
    expect(badAmount.status).toBe(400);

    const badPeriod = await post(
      `/api/communities/${communityId}/fee-charges/generate`,
      { period: '2026-13' },
    );
    expect(badPeriod.status).toBe(400);
  });

  it('las tarifas de la comunidad son solo suyas', async () => {
    const created = await post(`/api/communities/${communityId}/fee-tariffs`, {
      concept: 'Cuota solo nuestra',
      amount: '10.00',
    });
    expect(created.status).toBe(201);
    const tariff = (await created.json()) as FeeTariffView;

    // El dueño de la otra comunidad no puede tocar nuestra tarifa.
    const ajena = await ctx.request(
      `/api/communities/${otherCommunityId}/fee-tariffs/${tariff.id}`,
      { method: 'DELETE', cookie: member.cookie },
    );
    expect(ajena.status).toBe(404);

    // Y en su lista no aparece.
    const list = (await (
      await ctx.request(`/api/communities/${otherCommunityId}/fee-tariffs`, {
        cookie: member.cookie,
      })
    ).json()) as FeeTariffView[];
    expect(list.map((row) => row.concept)).not.toContain('Cuota solo nuestra');
  });

  it('la unidad conserva su tipo y no se puede borrar con cuotas', async () => {
    const units = (await (
      await ctx.request(`/api/communities/${communityId}/units`, {
        cookie: owner.cookie,
      })
    ).json()) as UnitView[];
    expect(units.map((unit) => unit.kind)).toEqual(['vivienda', 'garaje', 'trastero']);

    const garaje = units.find((unit) => unit.number === 'G-1');
    const remove = await ctx.request(
      `/api/communities/${communityId}/units/${garaje?.id}`,
      { method: 'DELETE', cookie: owner.cookie },
    );
    expect(remove.status).toBe(409);
  });
});
