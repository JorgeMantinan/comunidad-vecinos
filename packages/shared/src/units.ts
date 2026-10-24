import { z } from 'zod';
import { communityIdSchema } from './communities';

export const coefficientSchema = z
  .string()
  .regex(/^\d+(\.\d{1,6})?$/, 'Coeficiente inválido (ej. 1 o 0.25)')
  .refine((value) => Number(value) > 0, 'El coeficiente debe ser mayor que 0');

export const createUnitInputSchema = z.object({
  portal: z.string().trim().max(50).optional(),
  number: z.string().trim().min(1, 'Indica el número').max(50),
  coefficient: coefficientSchema,
});
export type CreateUnitInput = z.infer<typeof createUnitInputSchema>;

/** `numeric(10,6)` devuelve '1.000000'; se normaliza a '1'. */
const normalizeCoefficient = (value: string): string =>
  value.includes('.') ? value.replace(/0+$/, '').replace(/\.$/, '') : value;

export const unitSchema = z.object({
  id: z.string(),
  communityId: communityIdSchema,
  portal: z.string().nullable(),
  number: z.string(),
  coefficient: z.string().transform(normalizeCoefficient),
  createdAt: z.iso.datetime(),
});
export type UnitView = z.infer<typeof unitSchema>;
