import { z } from 'zod';
import { communityRoleSchema } from './roles';

export const communityIdSchema = z.string().regex(/^cm_[0-9a-f]{32}$/);
export const membershipIdSchema = z.string().regex(/^mem_[0-9a-f]{32}$/);

export const createCommunityInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  address: z.string().trim().max(300).optional(),
});
export type CreateCommunityInput = z.infer<typeof createCommunityInputSchema>;

export const updateCommunityInputSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  address: z.string().trim().max(300).nullable().optional(),
});

/** Comunidad tal como la ve un miembro, con su propio rol. */
export const communitySummarySchema = z.object({
  id: communityIdSchema,
  name: z.string(),
  address: z.string().nullable(),
  role: communityRoleSchema,
  createdAt: z.iso.datetime(),
});
export type CommunitySummary = z.infer<typeof communitySummarySchema>;

export const memberSchema = z.object({
  id: membershipIdSchema,
  userId: z.string(),
  name: z.string(),
  email: z.string(),
  role: communityRoleSchema,
  createdAt: z.iso.datetime(),
});
export type Member = z.infer<typeof memberSchema>;

export const updateMemberRoleInputSchema = z.object({
  role: communityRoleSchema,
});
