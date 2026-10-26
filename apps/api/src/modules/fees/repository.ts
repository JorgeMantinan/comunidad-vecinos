import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import type { FeeFrequency, FeeStatus, FeeTarget, UnitKind } from '@comunidad/shared';
import type { Database } from '../../db/client';
import { feeCharges, feeTariffs, units } from '../../db/schema';
import { newId } from '../../lib/ids';

export interface FeeTariffRow {
  id: string;
  communityId: string;
  concept: string;
  amount: string;
  target: FeeTarget;
  frequency: FeeFrequency;
  anchorPeriod: string;
  active: boolean;
  createdAt: Date;
}

export interface FeeChargeRow {
  id: string;
  communityId: string;
  tariffId: string | null;
  unitId: string;
  unitNumber: string;
  unitKind: UnitKind;
  period: string;
  concept: string;
  amount: string;
  status: FeeStatus;
  paidOn: string | null;
}

const tariffColumns = {
  id: feeTariffs.id,
  communityId: feeTariffs.communityId,
  concept: feeTariffs.concept,
  amount: feeTariffs.amount,
  target: feeTariffs.target,
  frequency: feeTariffs.frequency,
  anchorPeriod: feeTariffs.anchorPeriod,
  active: feeTariffs.active,
  createdAt: feeTariffs.createdAt,
} as const;

export async function listTariffs(
  db: Database,
  communityId: string,
): Promise<FeeTariffRow[]> {
  return db
    .select(tariffColumns)
    .from(feeTariffs)
    .where(eq(feeTariffs.communityId, communityId))
    .orderBy(asc(feeTariffs.concept));
}

export async function listActiveTariffs(
  db: Database,
  communityId: string,
): Promise<FeeTariffRow[]> {
  return db
    .select(tariffColumns)
    .from(feeTariffs)
    .where(and(eq(feeTariffs.communityId, communityId), eq(feeTariffs.active, true)))
    .orderBy(asc(feeTariffs.concept));
}

export async function findTariff(
  db: Database,
  communityId: string,
  tariffId: string,
): Promise<FeeTariffRow | null> {
  const [row] = await db
    .select(tariffColumns)
    .from(feeTariffs)
    .where(and(eq(feeTariffs.communityId, communityId), eq(feeTariffs.id, tariffId)))
    .limit(1);
  return row ?? null;
}

export interface CreateTariffValues {
  communityId: string;
  concept: string;
  amount: string;
  target: FeeTarget;
  frequency: FeeFrequency;
  anchorPeriod: string;
  createdById: string;
}

export async function createTariff(
  db: Database,
  values: CreateTariffValues,
): Promise<FeeTariffRow> {
  const [row] = await db
    .insert(feeTariffs)
    .values({ id: newId('ft'), ...values })
    .returning(tariffColumns);
  if (!row) {
    throw new Error('No se pudo crear la tarifa');
  }
  return row;
}

export async function updateTariff(
  db: Database,
  tariffId: string,
  values: Partial<Omit<CreateTariffValues, 'communityId' | 'createdById'>> & {
    active?: boolean;
  },
): Promise<void> {
  await db
    .update(feeTariffs)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(feeTariffs.id, tariffId));
}

export async function deleteTariff(db: Database, tariffId: string): Promise<void> {
  await db.delete(feeTariffs).where(eq(feeTariffs.id, tariffId));
}

/** Unidades con su tipo, para decidir a cuál aplica cada tarifa. */
export async function listUnitsForFees(
  db: Database,
  communityId: string,
): Promise<Array<{ id: string; number: string; kind: UnitKind }>> {
  return db
    .select({ id: units.id, number: units.number, kind: units.kind })
    .from(units)
    .where(eq(units.communityId, communityId))
    .orderBy(asc(units.number));
}

export async function listCharges(
  db: Database,
  communityId: string,
  period?: string,
): Promise<FeeChargeRow[]> {
  const rows = await db
    .select({
      id: feeCharges.id,
      communityId: feeCharges.communityId,
      tariffId: feeCharges.tariffId,
      unitId: feeCharges.unitId,
      unitNumber: units.number,
      unitKind: units.kind,
      period: feeCharges.period,
      concept: feeCharges.concept,
      amount: feeCharges.amount,
      status: feeCharges.status,
      paidOn: feeCharges.paidOn,
    })
    .from(feeCharges)
    .innerJoin(units, eq(feeCharges.unitId, units.id))
    .where(
      period
        ? and(eq(feeCharges.communityId, communityId), eq(feeCharges.period, period))
        : eq(feeCharges.communityId, communityId),
    )
    .orderBy(asc(units.number), asc(feeCharges.concept));
  return rows;
}

export interface ChargeValues {
  communityId: string;
  tariffId: string | null;
  unitId: string;
  period: string;
  concept: string;
  amount: string;
}

/**
 * Inserta los cargos del periodo ignorando los que ya existieran
 * (unique por comunidad+unidad+concepto+periodo): volver a generar no
 * duplica ni pisa cobros ya marcados.
 */
export async function insertCharges(
  db: Database,
  rows: ChargeValues[],
): Promise<number> {
  if (rows.length === 0) {
    return 0;
  }
  const inserted = await db
    .insert(feeCharges)
    .values(rows.map((row) => ({ id: newId('fc'), ...row })))
    .onConflictDoNothing()
    .returning({ id: feeCharges.id });
  return inserted.length;
}

export async function findCharge(
  db: Database,
  communityId: string,
  chargeId: string,
): Promise<(FeeChargeRow & { unitNumber: string }) | null> {
  const [row] = await db
    .select({
      id: feeCharges.id,
      communityId: feeCharges.communityId,
      tariffId: feeCharges.tariffId,
      unitId: feeCharges.unitId,
      unitNumber: units.number,
      unitKind: units.kind,
      period: feeCharges.period,
      concept: feeCharges.concept,
      amount: feeCharges.amount,
      status: feeCharges.status,
      paidOn: feeCharges.paidOn,
    })
    .from(feeCharges)
    .innerJoin(units, eq(feeCharges.unitId, units.id))
    .where(and(eq(feeCharges.communityId, communityId), eq(feeCharges.id, chargeId)))
    .limit(1);
  return row ?? null;
}

export async function updateCharge(
  db: Database,
  chargeId: string,
  status: FeeStatus,
  paidOn: string | null,
): Promise<void> {
  await db
    .update(feeCharges)
    .set({ status, paidOn, updatedAt: new Date() })
    .where(eq(feeCharges.id, chargeId));
}

/** Suma de lo pendiente de cobro por comunidad (panel de administración). */
export async function pendingTotals(
  db: Database,
  communityIds: string[],
): Promise<Array<{ communityId: string; value: string }>> {
  if (communityIds.length === 0) {
    return [];
  }
  return db
    .select({
      communityId: feeCharges.communityId,
      value: sql<string>`coalesce(sum(${feeCharges.amount}), 0)`,
    })
    .from(feeCharges)
    .where(
      and(
        inArray(feeCharges.communityId, communityIds),
        eq(feeCharges.status, 'pending'),
      ),
    )
    .groupBy(feeCharges.communityId);
}

export async function chargeUnitsExist(
  db: Database,
  communityId: string,
): Promise<boolean> {
  const rows = await db
    .select({ id: units.id })
    .from(units)
    .where(eq(units.communityId, communityId))
    .limit(1);
  return rows.length > 0;
}
