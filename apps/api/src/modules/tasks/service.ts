import type { CreateTaskInput, UpdateTaskInput } from '@comunidad/shared';
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

export async function createTask(
  db: Database,
  actor: Actor,
  communityId: string,
  input: CreateTaskInput,
): Promise<TaskRow> {
  if (input.assigneeId) {
    await assertAssigneeIsMember(db, communityId, input.assigneeId);
  }

  const task = await repo.createTask(db, {
    communityId,
    title: input.title,
    description: input.description ?? null,
    dueOn: input.dueOn ?? null,
    assigneeId: input.assigneeId ?? null,
    createdById: actor.id,
  });

  await recordAuditEvent(db, {
    communityId,
    actorId: actor.id,
    action: 'task.created',
    targetType: 'task',
    targetId: task.id,
    metadata: { title: input.title, dueOn: input.dueOn ?? null },
  });

  return task;
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

  const values: Parameters<typeof repo.updateTask>[2] = {};
  if (input.title !== undefined) values.title = input.title;
  if (input.description !== undefined) values.description = input.description;
  if (input.dueOn !== undefined) values.dueOn = input.dueOn;
  if (input.assigneeId !== undefined) values.assigneeId = input.assigneeId;
  if (input.status !== undefined) values.status = input.status;
  if (Object.keys(values).length === 0) {
    return;
  }

  await repo.updateTask(db, taskId, values);
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
