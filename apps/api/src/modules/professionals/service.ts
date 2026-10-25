import type {
  CreateProfessionalInput,
  UpdateProfessionalInput,
} from '@comunidad/shared';
import { recordAuditEvent } from '../../lib/audit';
import type { Database } from '../../db/client';
import { notFound } from '../../lib/errors';
import * as repo from './repository';
import type { ProfessionalRow } from './repository';

export interface Actor {
  id: string;
  name: string;
}

export async function addProfessional(
  db: Database,
  actor: Actor,
  communityId: string,
  input: CreateProfessionalInput,
): Promise<ProfessionalRow> {
  const professional = await repo.createProfessional(db, {
    communityId,
    name: input.name,
    trade: input.trade,
    phone: input.phone ?? null,
    email: input.email || null,
    notes: input.notes ?? null,
  });

  await recordAuditEvent(db, {
    communityId,
    actorId: actor.id,
    action: 'professional.created',
    targetType: 'professional',
    targetId: professional.id,
    metadata: { name: professional.name, trade: professional.trade },
  });

  return professional;
}

export async function editProfessional(
  db: Database,
  actor: Actor,
  communityId: string,
  professionalId: string,
  input: UpdateProfessionalInput,
): Promise<void> {
  const existing = await repo.findProfessionalById(db, communityId, professionalId);
  if (!existing) {
    throw notFound('Profesional no encontrado');
  }

  const values: Parameters<typeof repo.updateProfessional>[2] = {};
  if (input.name !== undefined) values.name = input.name;
  if (input.trade !== undefined) values.trade = input.trade;
  if (input.phone !== undefined) values.phone = input.phone;
  if (input.email !== undefined) values.email = input.email || null;
  if (input.notes !== undefined) values.notes = input.notes;
  if (Object.keys(values).length === 0) {
    return;
  }

  await repo.updateProfessional(db, professionalId, values);
  await recordAuditEvent(db, {
    communityId,
    actorId: actor.id,
    action: 'professional.updated',
    targetType: 'professional',
    targetId: professionalId,
    metadata: { fields: Object.keys(values) },
  });
}

export async function removeProfessional(
  db: Database,
  actor: Actor,
  communityId: string,
  professionalId: string,
): Promise<void> {
  const existing = await repo.findProfessionalById(db, communityId, professionalId);
  if (!existing) {
    throw notFound('Profesional no encontrado');
  }

  await repo.deleteProfessional(db, professionalId);
  await recordAuditEvent(db, {
    communityId,
    actorId: actor.id,
    action: 'professional.deleted',
    targetType: 'professional',
    targetId: professionalId,
    metadata: { name: existing.name },
  });
}
