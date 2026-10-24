import type { CreateUnitInput } from '@comunidad/shared';
import { recordAuditEvent } from '../../lib/audit';
import type { Database } from '../../db/client';
import { conflict, notFound } from '../../lib/errors';
import * as repo from './repository';
import type { UnitRow } from './repository';

export interface Actor {
  id: string;
}

export async function addUnit(
  db: Database,
  actor: Actor,
  communityId: string,
  input: CreateUnitInput,
): Promise<UnitRow> {
  const existing = await repo.findUnitByNumber(db, communityId, input.number);
  if (existing) {
    throw conflict(`Ya existe una unidad con el número "${input.number}"`);
  }

  const unit = await repo.createUnit(db, {
    communityId,
    portal: input.portal || null,
    number: input.number,
    coefficient: input.coefficient,
  });

  await recordAuditEvent(db, {
    communityId,
    actorId: actor.id,
    action: 'unit.created',
    targetType: 'unit',
    targetId: unit.id,
    metadata: { number: unit.number, coefficient: unit.coefficient },
  });

  return unit;
}

export async function removeUnit(
  db: Database,
  actor: Actor,
  communityId: string,
  unitId: string,
): Promise<void> {
  const unit = await repo.findUnitById(db, communityId, unitId);
  if (!unit) {
    throw notFound('Unidad no encontrada');
  }
  if (await repo.hasAssessmentCharges(db, unitId)) {
    throw conflict('No se puede eliminar una unidad con derramas registradas');
  }

  await repo.deleteUnit(db, unitId);
  await recordAuditEvent(db, {
    communityId,
    actorId: actor.id,
    action: 'unit.deleted',
    targetType: 'unit',
    targetId: unitId,
    metadata: { number: unit.number },
  });
}
