import { and, asc, desc, eq } from 'drizzle-orm';
import type { AssessmentChargeStatus } from '@comunidad/shared';
import type { Database } from '../../db/client';
import { assessmentCharges, assessments, units } from '../../db/schema';
import { newId } from '../../lib/ids';

export interface AssessmentRow {
  id: string;
  communityId: string;
  concept: string;
  totalAmount: string;
  createdAt: Date;
}

export interface ChargeRow {
  id: string;
  assessmentId: string;
  unitId: string;
  unitNumber: string;
  unitPortal: string | null;
  amount: string;
  status: AssessmentChargeStatus;
  paidOn: string | null;
}

const assessmentColumns = {
  id: assessments.id,
  communityId: assessments.communityId,
  concept: assessments.concept,
  totalAmount: assessments.totalAmount,
  createdAt: assessments.createdAt,
} as const;

/** Derramas de la comunidad, de la más reciente a la más antigua. */
export async function listAssessments(
  db: Database,
  communityId: string,
  limit = 100,
): Promise<AssessmentRow[]> {
  return db
    .select(assessmentColumns)
    .from(assessments)
    .where(eq(assessments.communityId, communityId))
    .orderBy(desc(assessments.createdAt))
    .limit(limit);
}

export async function findAssessmentById(
  db: Database,
  communityId: string,
  assessmentId: string,
): Promise<AssessmentRow | null> {
  const [row] = await db
    .select(assessmentColumns)
    .from(assessments)
    .where(eq(assessments.id, assessmentId))
    .limit(1);
  if (!row || row.communityId !== communityId) {
    return null;
  }
  return row;
}

/** Crea la derrama y sus cuotas en una transacción. */
export async function createAssessmentWithCharges(
  db: Database,
  values: {
    communityId: string;
    concept: string;
    totalAmount: string;
    createdById: string;
    charges: Array<{ unitId: string; amount: string }>;
  },
): Promise<AssessmentRow> {
  return db.transaction(async (tx) => {
    const [assessment] = await tx
      .insert(assessments)
      .values({
        id: newId('der'),
        communityId: values.communityId,
        concept: values.concept,
        totalAmount: values.totalAmount,
        createdById: values.createdById,
      })
      .returning(assessmentColumns);
    if (!assessment) {
      throw new Error('No se pudo crear la derrama');
    }

    await tx.insert(assessmentCharges).values(
      values.charges.map((charge) => ({
        id: newId('chr'),
        assessmentId: assessment.id,
        communityId: values.communityId,
        unitId: charge.unitId,
        amount: charge.amount,
        status: 'pending' as const,
      })),
    );

    return assessment;
  });
}

/** Cuotas de una derrama con los datos de su unidad. */
export async function listCharges(
  db: Database,
  assessmentId: string,
): Promise<ChargeRow[]> {
  return db
    .select({
      id: assessmentCharges.id,
      assessmentId: assessmentCharges.assessmentId,
      unitId: assessmentCharges.unitId,
      unitNumber: units.number,
      unitPortal: units.portal,
      amount: assessmentCharges.amount,
      status: assessmentCharges.status,
      paidOn: assessmentCharges.paidOn,
    })
    .from(assessmentCharges)
    .innerJoin(units, eq(assessmentCharges.unitId, units.id))
    .where(eq(assessmentCharges.assessmentId, assessmentId))
    .orderBy(asc(units.number));
}

export async function findCharge(
  db: Database,
  communityId: string,
  chargeId: string,
): Promise<ChargeRow | null> {
  const [row] = await db
    .select({
      id: assessmentCharges.id,
      assessmentId: assessmentCharges.assessmentId,
      unitId: assessmentCharges.unitId,
      unitNumber: units.number,
      unitPortal: units.portal,
      amount: assessmentCharges.amount,
      status: assessmentCharges.status,
      paidOn: assessmentCharges.paidOn,
    })
    .from(assessmentCharges)
    .innerJoin(units, eq(assessmentCharges.unitId, units.id))
    .where(
      and(
        eq(assessmentCharges.id, chargeId),
        eq(assessmentCharges.communityId, communityId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function payCharge(
  db: Database,
  chargeId: string,
  paidOn: string,
): Promise<void> {
  await db
    .update(assessmentCharges)
    .set({ status: 'paid', paidOn, updatedAt: new Date() })
    .where(eq(assessmentCharges.id, chargeId));
}

export async function deleteAssessment(
  db: Database,
  assessmentId: string,
): Promise<void> {
  await db.delete(assessments).where(eq(assessments.id, assessmentId));
}
