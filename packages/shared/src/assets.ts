import { z } from 'zod';
import { communityIdSchema } from './communities';

export const assetCategorySchema = z.enum([
  'elevator',
  'plumbing',
  'electrical',
  'heating',
  'common_area',
  'other',
]);
export type AssetCategory = z.infer<typeof assetCategorySchema>;

export const assetStatusSchema = z.enum(['operational', 'maintenance', 'broken']);
export type AssetStatus = z.infer<typeof assetStatusSchema>;

export const createAssetInputSchema = z.object({
  name: z.string().trim().min(2, 'Indica el elemento').max(150),
  category: assetCategorySchema,
  location: z.string().trim().max(200).nullish(),
  warrantyUntil: z.iso.date().nullish(),
  notes: z.string().trim().max(2000).nullish(),
});
export type CreateAssetInput = z.infer<typeof createAssetInputSchema>;

export const updateAssetInputSchema = createAssetInputSchema
  .partial()
  .extend({ status: assetStatusSchema.optional() });
export type UpdateAssetInput = z.infer<typeof updateAssetInputSchema>;

export const assetSchema = z.object({
  id: z.string(),
  communityId: communityIdSchema,
  name: z.string(),
  category: assetCategorySchema,
  location: z.string().nullable(),
  status: assetStatusSchema,
  warrantyUntil: z.iso.date().nullable(),
  notes: z.string().nullable(),
  createdAt: z.iso.datetime(),
});
export type AssetView = z.infer<typeof assetSchema>;
