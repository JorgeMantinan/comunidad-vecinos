import { z } from 'zod';
import { communityIdSchema } from './communities';

export const suggestionStatusSchema = z.enum([
  'open',
  'under_review',
  'accepted',
  'rejected',
]);
export type SuggestionStatus = z.infer<typeof suggestionStatusSchema>;

export const createSuggestionInputSchema = z.object({
  title: z.string().trim().min(3).max(150),
  body: z.string().trim().min(1, 'Describe tu sugerencia').max(5000),
});
export type CreateSuggestionInput = z.infer<typeof createSuggestionInputSchema>;

export const updateSuggestionStatusInputSchema = z.object({
  status: suggestionStatusSchema,
});

export const suggestionSchema = z.object({
  id: z.string(),
  communityId: communityIdSchema,
  title: z.string(),
  body: z.string(),
  status: suggestionStatusSchema,
  authorName: z.string().nullable(),
  authorId: z.string().nullable(),
  createdAt: z.iso.datetime(),
});
export type SuggestionView = z.infer<typeof suggestionSchema>;
