import type {
  CreateFeeTariffInput,
  FeeFrequency,
  GenerateFeeChargesInput,
  UpdateFeeChargeInput,
  UpdateFeeTariffInput,
} from '@comunidad/shared';
import { recordAuditEvent } from '../../lib/audit';
import type { Database } from '../../db/client';
import { conflict, notFound, validationError } from '../../lib/errors';
import * as repo from './repository';
import type { FeeTariffRow } from './repository';

export interface Actor {
  id: string;
}

export interface GenerateResult {
  period: string;
  generated: number;
  alreadyRegistered: number;
}

/** Periodo en curso en UTC (AAAA-MM). */
export function currentPeriod(date = new Date()): string {
  return date.toISOString().slice(0, 7);
}

/** Meses transcurridos desde el periodo ancla (negativo = es anterior). */
function monthsBetween(anchor: string, period: string): number {
  const [anchorYear, anchorMonth] = anchor.split('-').map(Number);
  const [year, month] = period.split('-').map(Number);
  if (!anchorYear || !anchorMonth || !year || !month) {
    throw validationError('Periodo inválido (AAAA-MM)');
  }
  return (year - anchorYear) * 12 + (month - anchorMonth);
}

/**
 * ¿Corresponde generar la tarifa en `period`? La periodicidad se cuenta
 * desde el periodo ancla: mensual (cada mes), trimestral (cada 3) y
 * anual (cada 12). Determinista y explícito, sin cron.
 */
export function isDue(
  anchor: string,
  period: string,
  frequency: FeeFrequency,
): boolean {
  const diff = monthsBetween(anchor, period);
  if (diff < 0) {
    return false;
  }
  const step = frequency === 'monthly' ? 1 : frequency === 'quarterly' ? 3 : 12;
  return diff % step === 0;
}

export async function createFeeTariff(
  db: Database,
  actor: Actor,
  communityId: string,
  input: CreateFeeTariffInput,
): Promise<FeeTariffRow> {
  const tariff = await repo.createTariff(db, {
    communityId,
    concept: input.concept,
    amount: input.amount,
    target: input.target,
    frequency: input.frequency,
    anchorPeriod: input.anchorPeriod ?? currentPeriod(),
    createdById: actor.id,
  });

  await recordAuditEvent(db, {
    communityId,
    actorId: actor.id,
    action: 'fee_tariff.created',
    targetType: 'fee_tariff',
    targetId: tariff.id,
    metadata: {
      concept: tariff.concept,
      amount: tariff.amount,
      target: tariff.target,
      frequency: tariff.frequency,
    },
  });

  return tariff;
}

export async function editFeeTariff(
  db: Database,
  actor: Actor,
  communityId: string,
  tariffId: string,
  input: UpdateFeeTariffInput,
): Promise<void> {
  const existing = await repo.findTariff(db, communityId, tariffId);
  if (!existing) {
    throw notFound('Tarifa no encontrada');
  }

  const values: Parameters<typeof repo.updateTariff>[2] = {};
  if (input.concept !== undefined) values.concept = input.concept;
  if (input.amount !== undefined) values.amount = input.amount;
  if (input.target !== undefined) values.target = input.target;
  if (input.frequency !== undefined) values.frequency = input.frequency;
  if (input.anchorPeriod !== undefined) values.anchorPeriod = input.anchorPeriod;
  if (input.active !== undefined) values.active = input.active;
  if (Object.keys(values).length === 0) {
    return;
  }

  await repo.updateTariff(db, tariffId, values);
  await recordAuditEvent(db, {
    communityId,
    actorId: actor.id,
    action: 'fee_tariff.updated',
    targetType: 'fee_tariff',
    targetId: tariffId,
    metadata: { fields: Object.keys(values) },
  });
}

export async function removeFeeTariff(
  db: Database,
  actor: Actor,
  communityId: string,
  tariffId: string,
): Promise<void> {
  const existing = await repo.findTariff(db, communityId, tariffId);
  if (!existing) {
    throw notFound('Tarifa no encontrada');
  }
  // Los cargos generados se conservan: al borrar la tarifa solo pierden
  // el enlace (snapshot de concepto e importe).
  await repo.deleteTariff(db, tariffId);
  await recordAuditEvent(db, {
    communityId,
    actorId: actor.id,
    action: 'fee_tariff.deleted',
    targetType: 'fee_tariff',
    targetId: tariffId,
    metadata: { concept: existing.concept },
  });
}

/**
 * Genera los cargos de un periodo: una fila por tarifa vigente y por
 * unidad a la que aplica. Repetir la operación no duplica (unique por
 * comunidad+unidad+concepto+periodo) ni pisa los cobros ya marcados.
 */
export async function generateFeeCharges(
  db: Database,
  actor: Actor,
  communityId: string,
  input: GenerateFeeChargesInput,
): Promise<GenerateResult> {
  const unitRows = await repo.listUnitsForFees(db, communityId);
  if (unitRows.length === 0) {
    throw conflict(
      'La comunidad no tiene unidades registradas: añade unidades antes de generar las cuotas',
    );
  }

  const tariffs = await repo.listActiveTariffs(db, communityId);
  if (tariffs.length === 0) {
    throw conflict('No hay tarifas activas: crea una cuota o tasa antes de generar');
  }

  const due = tariffs.filter((tariff) =>
    isDue(tariff.anchorPeriod, input.period, tariff.frequency),
  );
  if (due.length === 0) {
    throw conflict(
      `Ninguna tarifa corresponde generar en ${input.period}: revisa su periodicidad y su periodo inicial`,
    );
  }

  const rows: repo.ChargeValues[] = [];
  for (const tariff of due) {
    for (const unit of unitRows) {
      if (tariff.target !== 'all' && tariff.target !== unit.kind) {
        continue;
      }
      rows.push({
        communityId,
        tariffId: tariff.id,
        unitId: unit.id,
        period: input.period,
        concept: tariff.concept,
        amount: tariff.amount,
      });
    }
  }

  const generated = await repo.insertCharges(db, rows);

  await recordAuditEvent(db, {
    communityId,
    actorId: actor.id,
    action: 'fee_charges.generated',
    targetType: 'fee_charge',
    metadata: {
      period: input.period,
      generated,
      skipped: rows.length - generated,
      tariffs: due.length,
    },
  });

  return {
    period: input.period,
    generated,
    alreadyRegistered: rows.length - generated,
  };
}

export async function setFeeChargeStatus(
  db: Database,
  actor: Actor,
  communityId: string,
  chargeId: string,
  input: UpdateFeeChargeInput,
): Promise<void> {
  const charge = await repo.findCharge(db, communityId, chargeId);
  if (!charge) {
    throw notFound('Cuota no encontrada');
  }

  const paidOn = input.status === 'paid' ? new Date().toISOString().slice(0, 10) : null;
  await repo.updateCharge(db, chargeId, input.status, paidOn);

  await recordAuditEvent(db, {
    communityId,
    actorId: actor.id,
    action: input.status === 'paid' ? 'fee_charge.paid' : 'fee_charge.unpaid',
    targetType: 'fee_charge',
    targetId: chargeId,
    metadata: {
      concept: charge.concept,
      unit: charge.unitNumber,
      amount: charge.amount,
      period: charge.period,
    },
  });
}
