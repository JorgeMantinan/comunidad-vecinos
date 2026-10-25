import type { CreateContractInput, UpdateContractInput } from '@comunidad/shared';
import { recordAuditEvent } from '../../lib/audit';
import type { Database } from '../../db/client';
import { notFound, validationError } from '../../lib/errors';
import * as repo from './repository';
import type { ContractRow } from './repository';

export interface Actor {
  id: string;
}

export async function addContract(
  db: Database,
  actor: Actor,
  communityId: string,
  input: CreateContractInput,
): Promise<ContractRow> {
  const contract = await repo.createContract(db, {
    communityId,
    provider: input.provider,
    service: input.service,
    amount: input.amount,
    startOn: input.startOn,
    renewalOn: input.renewalOn,
    notes: input.notes ?? null,
    createdById: actor.id,
  });

  await recordAuditEvent(db, {
    communityId,
    actorId: actor.id,
    action: 'contract.created',
    targetType: 'contract',
    targetId: contract.id,
    metadata: {
      provider: contract.provider,
      amount: contract.amount,
      renewalOn: contract.renewalOn,
    },
  });

  return contract;
}

export async function editContract(
  db: Database,
  actor: Actor,
  communityId: string,
  contractId: string,
  input: UpdateContractInput,
): Promise<void> {
  const existing = await repo.findContractById(db, communityId, contractId);
  if (!existing) {
    throw notFound('Contrato no encontrado');
  }

  const values: Parameters<typeof repo.updateContract>[2] = {};
  if (input.provider !== undefined) values.provider = input.provider;
  if (input.service !== undefined) values.service = input.service;
  if (input.amount !== undefined) values.amount = input.amount;
  if (input.startOn !== undefined) values.startOn = input.startOn;
  if (input.renewalOn !== undefined) values.renewalOn = input.renewalOn;
  if (input.status !== undefined) values.status = input.status;
  if (input.notes !== undefined) values.notes = input.notes;
  if (Object.keys(values).length === 0) {
    return;
  }

  // Tras combinar fechas parciales, la restricción de BD debe cumplirse.
  const startOn = values.startOn ?? existing.startOn;
  const renewalOn = values.renewalOn ?? existing.renewalOn;
  if (renewalOn < startOn) {
    throw validationError('La renovación no puede ser anterior al inicio');
  }

  await repo.updateContract(db, contractId, values);
  await recordAuditEvent(db, {
    communityId,
    actorId: actor.id,
    action:
      input.status !== undefined && input.status !== existing.status
        ? 'contract.status_changed'
        : 'contract.updated',
    targetType: 'contract',
    targetId: contractId,
    metadata: {
      fields: Object.keys(values),
      ...(input.status !== undefined && input.status !== existing.status
        ? { from: existing.status, to: input.status }
        : {}),
    },
  });
}

export async function removeContract(
  db: Database,
  actor: Actor,
  communityId: string,
  contractId: string,
): Promise<void> {
  const existing = await repo.findContractById(db, communityId, contractId);
  if (!existing) {
    throw notFound('Contrato no encontrado');
  }

  await repo.deleteContract(db, contractId);
  await recordAuditEvent(db, {
    communityId,
    actorId: actor.id,
    action: 'contract.deleted',
    targetType: 'contract',
    targetId: contractId,
    metadata: { provider: existing.provider },
  });
}
