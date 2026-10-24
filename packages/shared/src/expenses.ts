import { z } from 'zod';
import { communityIdSchema } from './communities';

export const expenseCategorySchema = z.enum([
  'community',
  'administration',
  'repair',
  'supply',
  'other',
]);
export type ExpenseCategory = z.infer<typeof expenseCategorySchema>;

export const expenseStatusSchema = z.enum(['registered', 'paid']);
export type ExpenseStatus = z.infer<typeof expenseStatusSchema>;

/** Decimal exacto con dos decimos ('125.40'); nunca coma flotante. */
export const decimalAmountSchema = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, 'Importe inválido (ej. 125.40)');

export const createExpenseInputSchema = z.object({
  concept: z.string().trim().min(3).max(200),
  amount: decimalAmountSchema,
  category: expenseCategorySchema,
  incurredOn: z.iso.date('Fecha del gasto inválida (YYYY-MM-DD)'),
});
export type CreateExpenseInput = z.infer<typeof createExpenseInputSchema>;

export const updateExpenseInputSchema = createExpenseInputSchema.partial();
export type UpdateExpenseInput = z.infer<typeof updateExpenseInputSchema>;

export const payExpenseInputSchema = z.object({
  paidOn: z.iso.date().optional(),
});
export type PayExpenseInput = z.infer<typeof payExpenseInputSchema>;

export const expenseSchema = z.object({
  id: z.string(),
  communityId: communityIdSchema,
  concept: z.string(),
  amount: decimalAmountSchema,
  category: expenseCategorySchema,
  incurredOn: z.iso.date(),
  status: expenseStatusSchema,
  paidOn: z.iso.date().nullable(),
  createdAt: z.iso.datetime(),
});
export type ExpenseView = z.infer<typeof expenseSchema>;
