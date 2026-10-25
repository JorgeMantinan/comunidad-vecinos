import { and, asc, eq, inArray } from 'drizzle-orm';
import type { TaskRecurrence, TaskStatus } from '@comunidad/shared';
import type { Database } from '../../db/client';
import { agreements, tasks, user } from '../../db/schema';
import { newId } from '../../lib/ids';

export interface TaskRow {
  id: string;
  communityId: string;
  title: string;
  description: string | null;
  dueOn: string | null;
  status: TaskStatus;
  assigneeId: string | null;
  assigneeName: string | null;
  agreementId: string | null;
  agreementTitle: string | null;
  recurrence: TaskRecurrence | null;
  createdAt: Date;
}

const columns = {
  id: tasks.id,
  communityId: tasks.communityId,
  title: tasks.title,
  description: tasks.description,
  dueOn: tasks.dueOn,
  status: tasks.status,
  assigneeId: tasks.assigneeId,
  assigneeName: user.name,
  agreementId: tasks.agreementId,
  agreementTitle: agreements.title,
  recurrence: tasks.recurrence,
  createdAt: tasks.createdAt,
} as const;

/** Tareas de la comunidad: primero las que vencen antes. */
export async function listTasks(db: Database, communityId: string): Promise<TaskRow[]> {
  return db
    .select(columns)
    .from(tasks)
    .leftJoin(user, eq(tasks.assigneeId, user.id))
    .leftJoin(agreements, eq(tasks.agreementId, agreements.id))
    .where(eq(tasks.communityId, communityId))
    .orderBy(asc(tasks.dueOn), asc(tasks.createdAt));
}

export async function findTaskById(
  db: Database,
  communityId: string,
  taskId: string,
): Promise<TaskRow | null> {
  const [row] = await db
    .select(columns)
    .from(tasks)
    .leftJoin(user, eq(tasks.assigneeId, user.id))
    .leftJoin(agreements, eq(tasks.agreementId, agreements.id))
    .where(and(eq(tasks.id, taskId), eq(tasks.communityId, communityId)))
    .limit(1);
  return row ?? null;
}

/** Tareas derivadas de los acuerdos indicados (seguimiento). */
export async function listTasksByAgreementIds(
  db: Database,
  agreementIds: string[],
): Promise<
  Array<{ id: string; agreementId: string | null; title: string; status: TaskStatus }>
> {
  if (agreementIds.length === 0) {
    return [];
  }
  return db
    .select({
      id: tasks.id,
      agreementId: tasks.agreementId,
      title: tasks.title,
      status: tasks.status,
    })
    .from(tasks)
    .where(inArray(tasks.agreementId, agreementIds));
}

/** Acuerdo de referencia: debe pertenecer a la misma comunidad. */
export async function findAgreementRef(
  db: Database,
  communityId: string,
  agreementId: string,
): Promise<{ id: string; title: string } | null> {
  const [row] = await db
    .select({ id: agreements.id, title: agreements.title })
    .from(agreements)
    .where(and(eq(agreements.id, agreementId), eq(agreements.communityId, communityId)))
    .limit(1);
  return row ?? null;
}

export async function createTask(
  db: Database,
  values: {
    communityId: string;
    title: string;
    description: string | null;
    dueOn: string | null;
    assigneeId: string | null;
    agreementId: string | null;
    recurrence: TaskRecurrence | null;
    createdById: string;
  },
): Promise<TaskRow> {
  const [row] = await db
    .insert(tasks)
    .values({ id: newId('tsk'), status: 'todo', ...values })
    .returning({ id: tasks.id });
  if (!row) {
    throw new Error('No se pudo crear la tarea');
  }
  const created = await findTaskById(db, values.communityId, row.id);
  if (!created) {
    throw new Error('La tarea creada no se pudo leer');
  }
  return created;
}

export async function updateTask(
  db: Database,
  taskId: string,
  values: Partial<{
    title: string;
    description: string | null;
    dueOn: string | null;
    assigneeId: string | null;
    agreementId: string | null;
    recurrence: TaskRecurrence | null;
    status: TaskStatus;
  }>,
): Promise<void> {
  await db
    .update(tasks)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(tasks.id, taskId));
}

export async function deleteTask(db: Database, taskId: string): Promise<void> {
  await db.delete(tasks).where(eq(tasks.id, taskId));
}
