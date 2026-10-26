import { z } from 'zod';
import { communityIdSchema } from './communities';
import { decimalAmountSchema } from './expenses';
import { unitKindSchema } from './units';

/**
 * Cuotas ordinarias y tasas por anexo (garaje, trastero, plaza…).
 *
 * Modelo: una **tarifa** fija por unidad y periodo (no se reparte por
 * coeficiente, eso es lo que hace una derrama) con una periodicidad y
 * un periodo inicial; los **cargos** de un periodo se generan de forma
 * explícita desde la interfaz (sin cron: auditable, igual que las
 * tareas recurrentes) y se marcan como pagados.
 */
export const periodSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Periodo inválido (AAAA-MM)');

/** A qué unidades aplica la tarifa. */
export const feeTargetSchema = z.enum([
  'all',
  'vivienda',
  'garaje',
  'trastero',
  'local',
  'buzon',
  'plaza',
]);
export type FeeTarget = z.infer<typeof feeTargetSchema>;

export const feeFrequencySchema = z.enum(['monthly', 'quarterly', 'yearly']);
export type FeeFrequency = z.infer<typeof feeFrequencySchema>;

export const feeStatusSchema = z.enum(['pending', 'paid']);
export type FeeStatus = z.infer<typeof feeStatusSchema>;

export const createFeeTariffInputSchema = z.object({
  concept: z.string().trim().min(3, 'Indica el concepto').max(120),
  amount: decimalAmountSchema,
  target: feeTargetSchema.default('all'),
  frequency: feeFrequencySchema.default('monthly'),
  /**
   * Primer periodo al que se genera la tarifa. Si no se indica, el
   * servidor usa el periodo en curso.
   */
  anchorPeriod: periodSchema.optional(),
});
export type CreateFeeTariffInput = z.infer<typeof createFeeTariffInputSchema>;

export const updateFeeTariffInputSchema = createFeeTariffInputSchema
  .partial()
  .extend({ active: z.boolean().optional() });
export type UpdateFeeTariffInput = z.infer<typeof updateFeeTariffInputSchema>;

export const feeTariffSchema = z.object({
  id: z.string(),
  communityId: communityIdSchema,
  concept: z.string(),
  amount: decimalAmountSchema,
  target: feeTargetSchema,
  frequency: feeFrequencySchema,
  anchorPeriod: periodSchema,
  active: z.boolean(),
  createdAt: z.iso.datetime(),
});
export type FeeTariffView = z.infer<typeof feeTariffSchema>;

export const feeChargeSchema = z.object({
  id: z.string(),
  communityId: communityIdSchema,
  tariffId: z.string().nullable(),
  unitId: z.string(),
  unitNumber: z.string(),
  unitKind: unitKindSchema,
  period: periodSchema,
  concept: z.string(),
  amount: decimalAmountSchema,
  status: feeStatusSchema,
  paidOn: z.iso.date().nullable(),
});
export type FeeChargeView = z.infer<typeof feeChargeSchema>;

export const generateFeeChargesInputSchema = z.object({ period: periodSchema });
export type GenerateFeeChargesInput = z.infer<typeof generateFeeChargesInputSchema>;

/** Respuesta de la generación: `alreadyRegistered` son los que ya existían. */
export const generateFeeChargesResultSchema = z.object({
  period: periodSchema,
  generated: z.number().int().nonnegative(),
  alreadyRegistered: z.number().int().nonnegative(),
});
export type GenerateFeeChargesResult = z.infer<typeof generateFeeChargesResultSchema>;

export const updateFeeChargeInputSchema = z.object({ status: feeStatusSchema });
export type UpdateFeeChargeInput = z.infer<typeof updateFeeChargeInputSchema>;
