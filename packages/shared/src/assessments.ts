import { z } from 'zod';
import { communityIdSchema } from './communities';
import { decimalAmountSchema } from './expenses';

export const assessmentChargeStatusSchema = z.enum(['pending', 'paid']);
export type AssessmentChargeStatus = z.infer<typeof assessmentChargeStatusSchema>;

export const createAssessmentInputSchema = z.object({
  concept: z.string().trim().min(3, 'Indica el concepto').max(200),
  totalAmount: decimalAmountSchema,
});
export type CreateAssessmentInput = z.infer<typeof createAssessmentInputSchema>;

export const payChargeInputSchema = z.object({
  paidOn: z.iso.date().optional(),
});

export const assessmentSchema = z.object({
  id: z.string(),
  communityId: communityIdSchema,
  concept: z.string(),
  totalAmount: decimalAmountSchema,
  createdAt: z.iso.datetime(),
});
export type AssessmentView = z.infer<typeof assessmentSchema>;

export const assessmentChargeSchema = z.object({
  id: z.string(),
  unitId: z.string(),
  unitNumber: z.string(),
  unitPortal: z.string().nullable(),
  amount: decimalAmountSchema,
  status: assessmentChargeStatusSchema,
  paidOn: z.iso.date().nullable(),
});
export type AssessmentChargeView = z.infer<typeof assessmentChargeSchema>;

export const assessmentDetailSchema = assessmentSchema.extend({
  charges: z.array(assessmentChargeSchema),
});
export type AssessmentDetailView = z.infer<typeof assessmentDetailSchema>;
