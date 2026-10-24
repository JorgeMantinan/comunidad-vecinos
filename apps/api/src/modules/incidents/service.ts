import type { CreateIncidentInput, UpdateIncidentInput } from '@comunidad/shared';
import { recordAuditEvent } from '../../lib/audit';
import type { Database } from '../../db/client';
import { notFound } from '../../lib/errors';
import * as repo from './repository';
import type { IncidentRow } from './repository';

export interface Actor {
  id: string;
  name: string;
}

/** Cualquier miembro (incluida la residente) puede reportar averías. */
export async function reportIncident(
  db: Database,
  actor: Actor,
  communityId: string,
  input: CreateIncidentInput,
): Promise<IncidentRow> {
  const incident = await repo.createIncident(db, {
    communityId,
    title: input.title,
    description: input.description,
    reportedById: actor.id,
  });

  await recordAuditEvent(db, {
    communityId,
    actorId: actor.id,
    action: 'incident.created',
    targetType: 'incident',
    targetId: incident.id,
    metadata: { title: incident.title },
  });

  return { ...incident, reportedByName: actor.name };
}

export async function updateIncident(
  db: Database,
  actor: Actor,
  communityId: string,
  incidentId: string,
  input: UpdateIncidentInput,
): Promise<void> {
  const existing = await repo.findIncidentById(db, communityId, incidentId);
  if (!existing) {
    throw notFound('Incidencia no encontrada');
  }

  const values: Parameters<typeof repo.updateIncident>[2] = {};
  if (input.title !== undefined) values.title = input.title;
  if (input.description !== undefined) values.description = input.description;

  const statusChanged = input.status !== undefined && input.status !== existing.status;
  if (input.status !== undefined) {
    values.status = input.status;
    // Al resolver se marca la fecha; al reabrir se limpia.
    values.resolvedAt =
      input.status === 'resolved' ? (existing.resolvedAt ?? new Date()) : null;
  }

  if (Object.keys(values).length === 0) {
    return;
  }

  await repo.updateIncident(db, incidentId, values);

  if (statusChanged) {
    await recordAuditEvent(db, {
      communityId,
      actorId: actor.id,
      action: 'incident.status_changed',
      targetType: 'incident',
      targetId: incidentId,
      metadata: { from: existing.status, to: input.status, title: existing.title },
    });
  } else {
    await recordAuditEvent(db, {
      communityId,
      actorId: actor.id,
      action: 'incident.updated',
      targetType: 'incident',
      targetId: incidentId,
      metadata: { fields: Object.keys(values) },
    });
  }
}

export async function removeIncident(
  db: Database,
  actor: Actor,
  communityId: string,
  incidentId: string,
): Promise<void> {
  const existing = await repo.findIncidentById(db, communityId, incidentId);
  if (!existing) {
    throw notFound('Incidencia no encontrada');
  }

  await repo.deleteIncident(db, incidentId);
  await recordAuditEvent(db, {
    communityId,
    actorId: actor.id,
    action: 'incident.deleted',
    targetType: 'incident',
    targetId: incidentId,
    metadata: { title: existing.title },
  });
}
