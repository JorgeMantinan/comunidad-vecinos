import { z } from 'zod';
import { communityIdSchema } from './communities';
import { decimalAmountSchema } from './expenses';

export const contractStatusSchema = z.enum(['active', 'ended']);
export type ContractStatus = z.infer<typeof contractStatusSchema>;

const contractFieldsSchema = z.object({
  provider: z.string().trim().min(2, 'Indica el proveedor').max(150),
  service: z.string().trim().min(2, 'Describe el servicio').max(300),
  amount: decimalAmountSchema,
  startOn: z.iso.date('Fecha de inicio inválida'),
  renewalOn: z.iso.date('Fecha de renovación inválida'),
  notes: z.string().trim().max(1000).nullish(),
});

export const createContractInputSchema = contractFieldsSchema.refine(
  (input) => input.renewalOn >= input.startOn,
  {
    message: 'La renovación no puede ser anterior al inicio',
    path: ['renewalOn'],
  },
);
export type CreateContractInput = z.infer<typeof createContractInputSchema>;

/** Al editar, la combinación de fechas se revalida en el servidor. */
export const updateContractInputSchema = contractFieldsSchema
  .partial()
  .extend({ status: contractStatusSchema.optional() });
export type UpdateContractInput = z.infer<typeof updateContractInputSchema>;

export const contractSchema = z.object({
  id: z.string(),
  communityId: communityIdSchema,
  provider: z.string(),
  service: z.string(),
  amount: decimalAmountSchema,
  startOn: z.iso.date(),
  renewalOn: z.iso.date(),
  status: contractStatusSchema,
  notes: z.string().nullable(),
  createdAt: z.iso.datetime(),
});
export type ContractView = z.infer<typeof contractSchema>;
