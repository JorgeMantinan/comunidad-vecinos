import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createPollInputSchema, pollDetailSchema, pollSchema } from '@comunidad/shared';
import type { CreatePollInput } from '@comunidad/shared';
import { z } from 'zod';
import { apiFetch } from '../../lib/api-client';
import { validated } from '../../lib/validated';

export const pollsKey = (communityId: string) =>
  ['communities', communityId, 'polls'] as const;

export const pollKey = (communityId: string, pollId: string) =>
  ['communities', communityId, 'polls', pollId] as const;

export function usePolls(communityId: string | undefined) {
  return useQuery({
    queryKey: pollsKey(communityId ?? 'none'),
    enabled: communityId !== undefined,
    queryFn: async () =>
      validated(
        z.array(pollSchema),
        await apiFetch<unknown>(`/api/communities/${communityId}/polls`),
      ),
  });
}

export function usePollDetail(communityId: string | undefined, pollId: string | null) {
  return useQuery({
    queryKey: pollKey(communityId ?? 'none', pollId ?? 'none'),
    enabled: communityId !== undefined && pollId !== null,
    queryFn: async () =>
      validated(
        pollDetailSchema,
        await apiFetch<unknown>(`/api/communities/${communityId}/polls/${pollId}`),
      ),
  });
}

function useInvalidatePolls(communityId: string) {
  const queryClient = useQueryClient();
  return (pollId?: string) => {
    void queryClient.invalidateQueries({ queryKey: pollsKey(communityId) });
    if (pollId) {
      void queryClient.invalidateQueries({
        queryKey: pollKey(communityId, pollId),
      });
    }
  };
}

export function useCreatePoll(communityId: string) {
  const invalidate = useInvalidatePolls(communityId);
  return useMutation({
    mutationFn: async (input: CreatePollInput) =>
      validated(
        pollDetailSchema,
        await apiFetch<unknown>(`/api/communities/${communityId}/polls`, {
          method: 'POST',
          body: JSON.stringify(createPollInputSchema.parse(input)),
        }),
      ),
    onSuccess: (poll) => invalidate(poll.id),
  });
}

export function useVotePoll(communityId: string) {
  const invalidate = useInvalidatePolls(communityId);
  return useMutation({
    mutationFn: async (input: { pollId: string; optionId: string }) =>
      validated(
        pollDetailSchema,
        await apiFetch<unknown>(
          `/api/communities/${communityId}/polls/${input.pollId}/vote`,
          { method: 'POST', body: JSON.stringify({ optionId: input.optionId }) },
        ),
      ),
    onSuccess: (poll) => invalidate(poll.id),
  });
}

export function useClosePoll(communityId: string) {
  const invalidate = useInvalidatePolls(communityId);
  return useMutation({
    mutationFn: async (pollId: string) =>
      apiFetch<unknown>(`/api/communities/${communityId}/polls/${pollId}/close`, {
        method: 'POST',
        body: '{}',
      }),
    onSuccess: (_data, pollId) => invalidate(pollId),
  });
}

export function useDeletePoll(communityId: string) {
  const invalidate = useInvalidatePolls(communityId);
  return useMutation({
    mutationFn: async (pollId: string) =>
      apiFetch<unknown>(`/api/communities/${communityId}/polls/${pollId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => invalidate(),
  });
}
