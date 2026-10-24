import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  auditEventSchema,
  communitySummarySchema,
  createCommunityInputSchema,
  createInvitationInputSchema,
  invitationSchema,
  memberSchema,
  pendingInvitationSchema,
  updateMemberRoleInputSchema,
} from '@comunidad/shared';
import type {
  CreateCommunityInput,
  CreateInvitationInput,
} from '@comunidad/shared';
import { z } from 'zod';
import { apiFetch } from './api-client';

/**
 * Consultas y mutaciones de la API. Las respuestas se validan con los
 * contratos de `@comunidad/shared` antes de llegar a la interfaz.
 */
function validated<T>(schema: z.ZodType<T>, data: unknown): T {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new Error('La API devolvió una respuesta inesperada');
  }
  return parsed.data;
}

const communitiesKey = ['communities'] as const;
const communityKey = (id: string) => ['communities', id] as const;

export function useCommunities() {
  return useQuery({
    queryKey: communitiesKey,
    queryFn: async () =>
      validated(
        z.array(communitySummarySchema),
        await apiFetch<unknown>('/api/communities'),
      ),
  });
}

export function useCreateCommunity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateCommunityInput) =>
      validated(
        communitySummarySchema,
        await apiFetch<unknown>('/api/communities', {
          method: 'POST',
          body: JSON.stringify(createCommunityInputSchema.parse(input)),
        }),
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: communitiesKey });
    },
  });
}

export function useCommunity(communityId: string | undefined) {
  return useQuery({
    queryKey: communityKey(communityId ?? 'none'),
    enabled: communityId !== undefined,
    queryFn: async () =>
      validated(
        communitySummarySchema,
        await apiFetch<unknown>(`/api/communities/${communityId}`),
      ),
  });
}

export function useMembers(communityId: string | undefined) {
  return useQuery({
    queryKey: [...communityKey(communityId ?? 'none'), 'members'],
    enabled: communityId !== undefined,
    queryFn: async () =>
      validated(
        z.array(memberSchema),
        await apiFetch<unknown>(`/api/communities/${communityId}/members`),
      ),
  });
}

export function useChangeMemberRole(communityId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { memberId: string; role: string }) => {
      const { role } = updateMemberRoleInputSchema.parse({ role: input.role });
      await apiFetch<unknown>(
        `/api/communities/${communityId}/members/${input.memberId}`,
        { method: 'PATCH', body: JSON.stringify({ role }) },
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [...communityKey(communityId), 'members'],
      });
    },
  });
}

export function useRemoveMember(communityId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (memberId: string) =>
      apiFetch<unknown>(
        `/api/communities/${communityId}/members/${memberId}`,
        { method: 'DELETE' },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [...communityKey(communityId), 'members'],
      });
    },
  });
}

export function useInvitations(communityId: string | undefined) {
  return useQuery({
    queryKey: [...communityKey(communityId ?? 'none'), 'invitations'],
    enabled: communityId !== undefined,
    queryFn: async () =>
      validated(
        z.array(invitationSchema),
        await apiFetch<unknown>(`/api/communities/${communityId}/invitations`),
      ),
  });
}

export interface CreatedInvitation {
  invitation: z.infer<typeof invitationSchema>;
  token: string;
}

export function useCreateInvitation(communityId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateInvitationInput) =>
      validated(
        z.object({
          invitation: invitationSchema,
          token: z.string(),
        }),
        await apiFetch<unknown>(`/api/communities/${communityId}/invitations`, {
          method: 'POST',
          body: JSON.stringify(createInvitationInputSchema.parse(input)),
        }),
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [...communityKey(communityId), 'invitations'],
      });
    },
  });
}

export function useRevokeInvitation(communityId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (invitationId: string) =>
      apiFetch<unknown>(
        `/api/communities/${communityId}/invitations/${invitationId}`,
        { method: 'DELETE' },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [...communityKey(communityId), 'invitations'],
      });
    },
  });
}

const pendingInvitationsKey = ['invitations', 'pending'] as const;

export function usePendingInvitations() {
  return useQuery({
    queryKey: pendingInvitationsKey,
    queryFn: async () =>
      validated(
        z.array(pendingInvitationSchema),
        await apiFetch<unknown>('/api/invitations/pending'),
      ),
  });
}

export function useAcceptInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (token: string) =>
      apiFetch<{ communityId: string; communityName: string; role: string }>(
        '/api/invitations/accept',
        { method: 'POST', body: JSON.stringify({ token }) },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: communitiesKey });
      void queryClient.invalidateQueries({
        queryKey: pendingInvitationsKey,
      });
    },
  });
}

export function useAuditEvents(communityId: string | undefined) {
  return useQuery({
    queryKey: [...communityKey(communityId ?? 'none'), 'audit'],
    enabled: communityId !== undefined,
    queryFn: async () =>
      validated(
        z.array(auditEventSchema),
        await apiFetch<unknown>(
          `/api/communities/${communityId}/audit-events?limit=20`,
        ),
      ),
  });
}
