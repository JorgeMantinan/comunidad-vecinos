import { z } from 'zod';
import { communityIdSchema } from './communities';
import { invitableRoleSchema } from './roles';

export const createInvitationInputSchema = z.object({
  email: z.email().toLowerCase(),
  role: invitableRoleSchema,
});
export type CreateInvitationInput = z.infer<typeof createInvitationInputSchema>;

export const acceptInvitationInputSchema = z.object({
  token: z.string().min(32).max(128),
});
export type AcceptInvitationInput = z.infer<typeof acceptInvitationInputSchema>;

/** Invitación vista por quien la creó: nunca expone el token. */
export const invitationSchema = z.object({
  id: z.string(),
  email: z.string(),
  role: invitableRoleSchema,
  status: z.enum(['pending', 'accepted', 'revoked', 'expired']),
  createdAt: z.iso.datetime(),
  expiresAt: z.iso.datetime(),
});
export type Invitation = z.infer<typeof invitationSchema>;

/** Invitación pendiente vista por el invitado. */
export const pendingInvitationSchema = z.object({
  id: z.string(),
  communityId: communityIdSchema,
  communityName: z.string(),
  communityAddress: z.string().nullable(),
  email: z.string(),
  role: invitableRoleSchema,
  invitedByName: z.string(),
  expiresAt: z.iso.datetime(),
});
export type PendingInvitation = z.infer<typeof pendingInvitationSchema>;

export const invitationIdParamsSchema = z.object({
  id: communityIdSchema,
  invitationId: z.string().min(1),
});
