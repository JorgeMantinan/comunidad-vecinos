import { desc, eq } from 'drizzle-orm';
import type { ExpenseCategory, ExpenseStatus } from '@comunidad/shared';
import type { Database } from '../../db/client';
import { expenses } from '../../db/schema';
import { newId } from '../../lib/ids';

export interface ExpenseRow {
  id: string;
  communityId: string;
  concept: string;
  amount: string;
  category: ExpenseCategory;
  incurredOn: string;
  status: ExpenseStatus;
  paidOn: string | null;
  createdAt: Date;
}

const columns = {
  id: expenses.id,
  communityId: expenses.communityId,
  concept: expenses.concept,
  amount: expenses.amount,
  category: expenses.category,
  incurredOn: expenses.incurredOn,
  status: expenses.status,
  paidOn: expenses.paidOn,
  createdAt: expenses.createdAt,
} as const;

interface ExpenseValues {
  communityId: string;
  concept: string;
  amount: string;
  category: ExpenseCategory;
  incurredOn: string;
  createdById: string;
}

/** Gastos de la comunidad, del más reciente al más antiguo. */
export async function listExpenses(
  db: Database,
  communityId: string,
  limit = 100,
): Promise<ExpenseRow[]> {
  return db
    .select(columns)
    .from(expenses)
    .where(eq(expenses.communityId, communityId))
    .orderBy(desc(expenses.incurredOn), desc(expenses.createdAt))
    .limit(limit);
}

export async function findExpenseById(
  db: Database,
  communityId: string,
  expenseId: string,
): Promise<ExpenseRow | null> {
  const [row] = await db
    .select(columns)
    .from(expenses)
    .where(eq(expenses.id, expenseId))
    .limit(1);
  if (!row || row.communityId !== communityId) {
    return null;
  }
  return row;
}

export async function createExpense(
  db: Database,
  values: ExpenseValues,
): Promise<ExpenseRow> {
  const [row] = await db
    .insert(expenses)
    .values({ id: newId('exp'), status: 'registered', ...values })
    .returning(columns);
  if (!row) {
    throw new Error('No se pudo registrar el gasto');
  }
  return row;
}

export async function updateExpense(
  db: Database,
  expenseId: string,
  values: Partial<{
    concept: string;
    amount: string;
    category: ExpenseCategory;
    incurredOn: string;
  }>,
): Promise<void> {
  await db
    .update(expenses)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(expenses.id, expenseId));
}

/** Marca el gasto como pagado con su fecha (constraint de BD lo exige). */
export async function payExpense(
  db: Database,
  expenseId: string,
  paidOn: string,
): Promise<void> {
  await db
    .update(expenses)
    .set({ status: 'paid', paidOn, updatedAt: new Date() })
    .where(eq(expenses.id, expenseId));
}

export async function deleteExpense(db: Database, expenseId: string): Promise<void> {
  await db.delete(expenses).where(eq(expenses.id, expenseId));
}
