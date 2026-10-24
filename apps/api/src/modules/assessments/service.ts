import type { CreateAssessmentInput } from '@comunidad/shared';
import { recordAuditEvent } from '../../lib/audit';
import type { Database } from '../../db/client';
import { conflict, notFound, validationError } from '../../lib/errors';
import * as unitRepo from '../units/repository';
import * as repo from './repository';
import type { AssessmentRow, ChargeRow } from './repository';

export interface Actor {
  id: string;
}

export interface AssessmentDetail {
  assessment: AssessmentRow;
  charges: ChargeRow[];
}

/**
 * Reparte `totalAmount` entre las unidades por coeficiente usando
 * céntimos enteros: cada unidad recibe al menos 1 céntimo, la suma es
 * exacta y los céntimos sobrantes van a los mayores coeficientes.
 */
export function distributeCents(
  coefficients: readonly string[],
  totalAmount: string,
): string[] {
  const totalCents = Math.round(Number(totalAmount) * 100);
  const unitsCount = coefficients.length;

  if (!Number.isFinite(totalCents) || totalCents < unitsCount) {
    throw validationError(
      'El importe total es demasiado pequeño para repartirlo entre las unidades',
    );
  }

  const weights = coefficients.map((value) => Number(value));
  const weightSum = weights.reduce((sum, value) => sum + value, 0);

  // Base: 1 céntimo por unidad; resto repartido por proporción.
  const cents = coefficients.map(() => 1);
  let remaining = totalCents - unitsCount;
  const shares = weights.map((weight) => Math.floor((remaining * weight) / weightSum));
  shares.forEach((share, index) => {
    cents[index] = (cents[index] ?? 1) + share;
  });
  remaining -= shares.reduce((sum, share) => sum + share, 0);

  // Reparto de los céntimos sobrantes: mayor coeficiente primero.
  const order = weights
    .map((weight, index) => ({ weight, index }))
    .sort((a, b) => b.weight - a.weight);
  let cursor = 0;
  while (remaining > 0) {
    const target = order[cursor % order.length]?.index;
    if (target === undefined) break;
    cents[target] = (cents[target] ?? 0) + 1;
    remaining -= 1;
    cursor += 1;
  }

  return cents.map((value) => (value / 100).toFixed(2));
}

export async function getAssessmentDetail(
  db: Database,
  communityId: string,
  assessmentId: string,
): Promise<AssessmentDetail> {
  const assessment = await repo.findAssessmentById(db, communityId, assessmentId);
  if (!assessment) {
    throw notFound('Derrama no encontrada');
  }
  const charges = await repo.listCharges(db, assessmentId);
  return { assessment, charges };
}

/** Crea una derrama y reparte su importe entre las unidades actuales. */
export async function createAssessment(
  db: Database,
  actor: Actor,
  communityId: string,
  input: CreateAssessmentInput,
): Promise<AssessmentDetail> {
  const unitRows = await unitRepo.listUnits(db, communityId);
  if (unitRows.length === 0) {
    throw conflict(
      'La comunidad no tiene unidades registradas: añade unidades antes de repartir una derrama',
    );
  }

  const amounts = distributeCents(
    unitRows.map((unit) => unit.coefficient),
    input.totalAmount,
  );

  const assessment = await repo.createAssessmentWithCharges(db, {
    communityId,
    concept: input.concept,
    totalAmount: input.totalAmount,
    createdById: actor.id,
    charges: unitRows.map((unit, index) => ({
      unitId: unit.id,
      amount: amounts[index] ?? '0.00',
    })),
  });

  await recordAuditEvent(db, {
    communityId,
    actorId: actor.id,
    action: 'assessment.created',
    targetType: 'assessment',
    targetId: assessment.id,
    metadata: {
      concept: assessment.concept,
      totalAmount: assessment.totalAmount,
      units: unitRows.length,
    },
  });

  return getAssessmentDetail(db, communityId, assessment.id);
}

export async function markChargePaid(
  db: Database,
  actor: Actor,
  communityId: string,
  assessmentId: string,
  chargeId: string,
  input: { paidOn?: string },
): Promise<void> {
  const assessment = await repo.findAssessmentById(db, communityId, assessmentId);
  if (!assessment) {
    throw notFound('Derrama no encontrada');
  }

  const charge = await repo.findCharge(db, communityId, chargeId);
  if (!charge || charge.assessmentId !== assessmentId) {
    throw notFound('Cuota no encontrada');
  }
  if (charge.status === 'paid') {
    throw conflict('La cuota ya está pagada');
  }

  const paidOn = input.paidOn ?? new Date().toISOString().slice(0, 10);
  await repo.payCharge(db, chargeId, paidOn);
  await recordAuditEvent(db, {
    communityId,
    actorId: actor.id,
    action: 'assessment.charge_paid',
    targetType: 'assessment',
    targetId: assessmentId,
    metadata: { chargeId, unit: charge.unitNumber, amount: charge.amount, paidOn },
  });
}

export async function removeAssessment(
  db: Database,
  actor: Actor,
  communityId: string,
  assessmentId: string,
): Promise<void> {
  const assessment = await repo.findAssessmentById(db, communityId, assessmentId);
  if (!assessment) {
    throw notFound('Derrama no encontrada');
  }

  await repo.deleteAssessment(db, assessmentId);
  await recordAuditEvent(db, {
    communityId,
    actorId: actor.id,
    action: 'assessment.deleted',
    targetType: 'assessment',
    targetId: assessmentId,
    metadata: { concept: assessment.concept, totalAmount: assessment.totalAmount },
  });
}
