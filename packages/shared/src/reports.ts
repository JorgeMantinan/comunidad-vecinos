import { z } from 'zod';
import { expenseCategorySchema } from './expenses';

/**
 * Informe económico por periodo (agregaciones SQL, sin IA):
 * gastos y facturas del rango [from, to] (inclusive).
 */
export const economyReportQuerySchema = z.object({
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
});
export type EconomyReportQuery = z.infer<typeof economyReportQuerySchema>;

const moneySchema = z.string();

export const economyReportSchema = z.object({
  from: z.iso.date(),
  to: z.iso.date(),
  expenses: z.object({
    count: z.number().int().min(0),
    total: moneySchema,
    paidTotal: moneySchema,
    pendingTotal: moneySchema,
    byCategory: z.array(
      z.object({ category: expenseCategorySchema, total: moneySchema }),
    ),
  }),
  invoices: z.object({
    count: z.number().int().min(0),
    total: moneySchema,
    paidTotal: moneySchema,
  }),
});
export type EconomyReport = z.infer<typeof economyReportSchema>;
