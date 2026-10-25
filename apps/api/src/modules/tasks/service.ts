import type {
  CreateTaskInput,
  TaskRecurrence,
  UpdateTaskInput,
} from '@comunidad/shared';
import { recordAuditEvent } from '../../lib/audit';
import type { Database } from '../../db/client';
import { notFound, validationError } from '../../lib/errors';
import { findMembership } from '../communities/repository';
import * as repo from './repository';
import type { TaskRow } from './repository';

export interface Actor {
  id: string;
}

/** El responsable debe ser un miembro de la misma comunidad. */
async function assertAssigneeIsMember(
  db: Database,
  communityId: string,
  assigneeId: string,
): Promise<void> {
  const membership = await findMembership(db, assigneeId, communityId);
  if (!membership) {
    throw validationError('El responsable debe ser un miembro de la comunidad');
  }
}

/** El acuerdo vinculado debe pertenecer a la misma comunidad. */
async function assertAgreementBelongs(
  db: Database,
  communityId: string,
  agreementId: string,
): Promise<void> {
  const agreement = await repo.findAgreementRef(db, communityId, agreementId);
  if (!agreement) {
    throw validationError('El acuerdo indicado no pertenece a esta comunidad');
  }
}

export async function createTask(
  db: Database,
  actor: Actor,
  communityId: string,
  input: CreateTaskInput,
): Promise<TaskRow> {
  if (input.assigneeId) {
    await assertAssigneeIsMember(db, communityId, input.assigneeId);
  }
  if (input.agreementId) {
    await assertAgreementBelongs(db, communityId, input.agreementId);
  }

  const task = await repo.createTask(db, {
    communityId,
    title: input.title,
    description: input.description ?? null,
    dueOn: input.dueOn ?? null,
    assigneeId: input.assigneeId ?? null,
    agreementId: input.agreementId ?? null,
    recurrence: input.recurrence ?? null,
    createdById: actor.id,
  });

  await recordAuditEvent(db, {
    communityId,
    actorId: actor.id,
    action: 'task.created',
    targetType: 'task',
    targetId: task.id,
    metadata: {
      title: input.title,
      dueOn: input.dueOn ?? null,
      agreementId: input.agreementId ?? null,
      recurrence: input.recurrence ?? null,
    },
  });

  return task;
}

/**
 * Desplaza el vencimiento de una tarea recurrente recortando al último
 * día válido del mes objetivo (31 de enero + 1 mes → 28/29 de febrero).
 */
function shiftDueOn(dueOn: string, recurrence: TaskRecurrence): string {
  const [year, month, day] = dueOn.split('-').map(Number);
  const months = recurrence === 'monthly' ? 1 : recurrence === 'quarterly' ? 3 : 12;

  const target = new Date(Date.UTC(year ?? 2000, (month ?? 1) - 1 + months, 1));
  const lastDayOfTargetMonth = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const clampedDay = Math.min(day ?? 1, lastDayOfTargetMonth);
  target.setUTCDate(clampedDay);

  return target.toISOString().slice(0, 10);
}

export async function editTask(
  db: Database,
  actor: Actor,
  communityId: string,
  taskId: string,
  input: UpdateTaskInput,
): Promise<void> {
  const existing = await repo.findTaskById(db, communityId, taskId);
  if (!existing) {
    throw notFound('Tarea no encontrada');
  }
  if (input.assigneeId) {
    await assertAssigneeIsMember(db, communityId, input.assigneeId);
  }
  if (input.agreementId) {
    await assertAgreementBelongs(db, communityId, input.agreementId);
  }

  const values: Parameters<typeof repo.updateTask>[2] = {};
  if (input.title !== undefined) values.title = input.title;
  if (input.description !== undefined) values.description = input.description;
  if (input.dueOn !== undefined) values.dueOn = input.dueOn;
  if (input.assigneeId !== undefined) values.assigneeId = input.assigneeId;
  if (input.agreementId !== undefined) values.agreementId = input.agreementId;
  if (input.recurrence !== undefined) values.recurrence = input.recurrence;
  if (input.status !== undefined) values.status = input.status;
  if (Object.keys(values).length === 0) {
    return;
  }

  await repo.updateTask(db, taskId, values);

  // Proceso repetitivo: al completarse nace la siguiente ocurrencia.
  if (input.status === 'done' && existing.status !== 'done' && existing.recurrence) {
    const next = await repo.createTask(db, {
      communityId,
      title: existing.title,
      description: existing.description,
      dueOn: existing.dueOn ? shiftDueOn(existing.dueOn, existing.recurrence) : null,
      assigneeId: existing.assigneeId,
      agreementId: existing.agreementId,
      recurrence: existing.recurrence,
      createdById: actor.id,
    });
    await recordAuditEvent(db, {
      communityId,
      actorId: actor.id,
      action: 'task.recurred',
      targetType: 'task',
      targetId: next.id,
      metadata: {
        sourceTaskId: taskId,
        recurrence: existing.recurrence,
        dueOn: next.dueOn,
      },
    });
  }

  await recordAuditEvent(db, {
    communityId,
    actorId: actor.id,
    action: 'task.updated',
    targetType: 'task',
    targetId: taskId,
    metadata: { fields: Object.keys(values) },
  });
}

export async function removeTask(
  db: Database,
  actor: Actor,
  communityId: string,
  taskId: string,
): Promise<void> {
  const existing = await repo.findTaskById(db, communityId, taskId);
  if (!existing) {
    throw notFound('Tarea no encontrada');
  }

  await repo.deleteTask(db, taskId);
  await recordAuditEvent(db, {
    communityId,
    actorId: actor.id,
    action: 'task.deleted',
    targetType: 'task',
    targetId: taskId,
    metadata: { title: existing.title },
  });
}
