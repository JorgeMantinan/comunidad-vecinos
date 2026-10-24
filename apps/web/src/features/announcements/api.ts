import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { announcementSchema, createAnnouncementInputSchema } from '@comunidad/shared';
import type { CreateAnnouncementInput } from '@comunidad/shared';
import { z } from 'zod';
import { apiFetch } from '../../lib/api-client';
import { validated } from '../../lib/validated';

export const announcementsKey = (communityId: string) =>
  ['communities', communityId, 'announcements'] as const;

export function useAnnouncements(communityId: string | undefined) {
  return useQuery({
    queryKey: announcementsKey(communityId ?? 'none'),
    enabled: communityId !== undefined,
    queryFn: async () =>
      validated(
        z.array(announcementSchema),
        await apiFetch<unknown>(`/api/communities/${communityId}/announcements`),
      ),
  });
}

export function usePublishAnnouncement(communityId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateAnnouncementInput) =>
      validated(
        announcementSchema,
        await apiFetch<unknown>(`/api/communities/${communityId}/announcements`, {
          method: 'POST',
          body: JSON.stringify(createAnnouncementInputSchema.parse(input)),
        }),
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: announcementsKey(communityId),
      });
    },
  });
}

export function useDeleteAnnouncement(communityId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (announcementId: string) =>
      apiFetch<unknown>(
        `/api/communities/${communityId}/announcements/${announcementId}`,
        { method: 'DELETE' },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: announcementsKey(communityId),
      });
    },
  });
}
