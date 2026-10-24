import { z } from 'zod';
import { communityIdSchema } from './communities';
import { decimalAmountSchema } from './expenses';

export const invoiceStatusSchema = z.enum(['received', 'paid']);
export type InvoiceStatus = z.infer<typeof invoiceStatusSchema>;

export const createInvoiceInputSchema = z.object({
  number: z.string().trim().min(1, 'Indica el número de factura').max(50),
  supplier: z.string().trim().min(2, 'Indica el proveedor').max(150),
  amount: decimalAmountSchema,
  issuedOn: z.iso.date('Fecha de emisión inválida (YYYY-MM-DD)'),
  notes: z.string().trim().max(500).optional(),
});
export type CreateInvoiceInput = z.infer<typeof createInvoiceInputSchema>;

export const updateInvoiceInputSchema = createInvoiceInputSchema.partial();
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceInputSchema>;

export const payInvoiceInputSchema = z.object({
  paidOn: z.iso.date().optional(),
});

export const invoiceSchema = z.object({
  id: z.string(),
  communityId: communityIdSchema,
  number: z.string(),
  supplier: z.string(),
  amount: decimalAmountSchema,
  issuedOn: z.iso.date(),
  status: invoiceStatusSchema,
  paidOn: z.iso.date().nullable(),
  notes: z.string().nullable(),
  createdAt: z.iso.datetime(),
});
export type InvoiceView = z.infer<typeof invoiceSchema>;
