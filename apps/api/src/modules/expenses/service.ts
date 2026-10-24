import type {
  CreateExpenseInput,
  PayExpenseInput,
  UpdateExpenseInput,
} from '@comunidad/shared';
import { recordAuditEvent } from '../../lib/audit';
import type { Database } from '../../db/client';
import { conflict, notFound } from '../../lib/errors';
import * as repo from './repository';
import type { ExpenseRow } from './repository';

export interface Actor {
  id: string;
}

const todayIsoDate = (): string => new Date().toISOString().slice(0, 10);

/** Registra un gasto (siempre nace como `registered`). */
export async function recordExpense(
  db: Database,
  actor: Actor,
  communityId: string,
  input: CreateExpenseInput,
): Promise<ExpenseRow> {
  const expense = await repo.createExpense(db, {
    communityId,
    concept: input.concept,
    amount: input.amount,
    category: input.category,
    incurredOn: input.incurredOn,
    createdById: actor.id,
  });

  await recordAuditEvent(db, {
    communityId,
    actorId: actor.id,
    action: 'expense.created',
    targetType: 'expense',
    targetId: expense.id,
    metadata: {
      concept: expense.concept,
      amount: expense.amount,
      category: expense.category,
    },
  });

  return expense;
}

export async function editExpense(
  db: Database,
  actor: Actor,
  communityId: string,
  expenseId: string,
  input: UpdateExpenseInput,
): Promise<void> {
  const existing = await repo.findExpenseById(db, communityId, expenseId);
  if (!existing) {
    throw notFound('Gasto no encontrado');
  }

  const values: Parameters<typeof repo.updateExpense>[2] = {};
  if (input.concept !== undefined) values.concept = input.concept;
  if (input.amount !== undefined) values.amount = input.amount;
  if (input.category !== undefined) values.category = input.category;
  if (input.incurredOn !== undefined) values.incurredOn = input.incurredOn;
  if (Object.keys(values).length === 0) {
    return;
  }

  await repo.updateExpense(db, expenseId, values);
  await recordAuditEvent(db, {
    communityId,
    actorId: actor.id,
    action: 'expense.updated',
    targetType: 'expense',
    targetId: expenseId,
    metadata: { fields: Object.keys(values) },
  });
}

/** Transición `registered` → `paid` (idempotencia: no se repaga). */
export async function markExpensePaid(
  db: Database,
  actor: Actor,
  communityId: string,
  expenseId: string,
  input: PayExpenseInput,
): Promise<void> {
  const existing = await repo.findExpenseById(db, communityId, expenseId);
  if (!existing) {
    throw notFound('Gasto no encontrado');
  }
  if (existing.status === 'paid') {
    throw conflict('El gasto ya está pagado');
  }

  const paidOn = input.paidOn ?? todayIsoDate();
  await repo.payExpense(db, expenseId, paidOn);
  await recordAuditEvent(db, {
    communityId,
    actorId: actor.id,
    action: 'expense.paid',
    targetType: 'expense',
    targetId: expenseId,
    metadata: { amount: existing.amount, paidOn },
  });
}

export async function removeExpense(
  db: Database,
  actor: Actor,
  communityId: string,
  expenseId: string,
): Promise<void> {
  const existing = await repo.findExpenseById(db, communityId, expenseId);
  if (!existing) {
    throw notFound('Gasto no encontrado');
  }

  await repo.deleteExpense(db, expenseId);
  await recordAuditEvent(db, {
    communityId,
    actorId: actor.id,
    action: 'expense.deleted',
    targetType: 'expense',
    targetId: expenseId,
    metadata: { concept: existing.concept, amount: existing.amount },
  });
}
