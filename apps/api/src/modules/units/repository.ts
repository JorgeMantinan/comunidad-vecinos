import { and, asc, eq, sql } from 'drizzle-orm';
import type { UnitKind } from '@comunidad/shared';
import type { Database } from '../../db/client';
import { assessmentCharges, feeCharges, units } from '../../db/schema';
import { newId } from '../../lib/ids';

export interface UnitRow {
  id: string;
  communityId: string;
  portal: string | null;
  number: string;
  coefficient: string;
  kind: UnitKind;
  createdAt: Date;
}

const columns = {
  id: units.id,
  communityId: units.communityId,
  portal: units.portal,
  number: units.number,
  coefficient: units.coefficient,
  kind: units.kind,
  createdAt: units.createdAt,
} as const;

/** Unidades (viviendas/locales) de la comunidad ordenadas por número. */
export async function listUnits(db: Database, communityId: string): Promise<UnitRow[]> {
  return db
    .select(columns)
    .from(units)
    .where(eq(units.communityId, communityId))
    .orderBy(asc(units.number));
}

export async function findUnitById(
  db: Database,
  communityId: string,
  unitId: string,
): Promise<UnitRow | null> {
  const [row] = await db
    .select(columns)
    .from(units)
    .where(and(eq(units.id, unitId), eq(units.communityId, communityId)))
    .limit(1);
  return row ?? null;
}

export async function findUnitByNumber(
  db: Database,
  communityId: string,
  number: string,
): Promise<UnitRow | null> {
  const [row] = await db
    .select(columns)
    .from(units)
    .where(and(eq(units.number, number), eq(units.communityId, communityId)))
    .limit(1);
  return row ?? null;
}

export async function createUnit(
  db: Database,
  values: {
    communityId: string;
    portal: string | null;
    number: string;
    coefficient: string;
    kind: UnitKind;
  },
): Promise<UnitRow> {
  const [row] = await db
    .insert(units)
    .values({ id: newId('uni'), ...values })
    .returning(columns);
  if (!row) {
    throw new Error('No se pudo crear la unidad');
  }
  return row;
}

export async function deleteUnit(db: Database, unitId: string): Promise<void> {
  await db.delete(units).where(eq(units.id, unitId));
}

/**
 * True si la unidad participa en derramas: su historial económico no
 * puede destruirse al eliminarla.
 */
export async function hasAssessmentCharges(
  db: Database,
  unitId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ value: sql<number>`count(*)` })
    .from(assessmentCharges)
    .where(eq(assessmentCharges.unitId, unitId))
    .limit(1);
  return Number(row?.value ?? 0) > 0;
}

/** True si la unidad tiene cuotas registradas (su historial se conserva). */
export async function hasFeeCharges(db: Database, unitId: string): Promise<boolean> {
  const [row] = await db
    .select({ value: sql<number>`count(*)` })
    .from(feeCharges)
    .where(eq(feeCharges.unitId, unitId))
    .limit(1);
  return Number(row?.value ?? 0) > 0;
}
