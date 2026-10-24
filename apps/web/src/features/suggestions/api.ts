import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createSuggestionInputSchema,
  suggestionSchema,
  updateSuggestionStatusInputSchema,
} from '@comunidad/shared';
import type { CreateSuggestionInput } from '@comunidad/shared';
import { z } from 'zod';
import { apiFetch } from '../../lib/api-client';
import { validated } from '../../lib/validated';

export const suggestionsKey = (communityId: string) =>
  ['communities', communityId, 'suggestions'] as const;

export function useSuggestions(communityId: string | undefined) {
  return useQuery({
    queryKey: suggestionsKey(communityId ?? 'none'),
    enabled: communityId !== undefined,
    queryFn: async () =>
      validated(
        z.array(suggestionSchema),
        await apiFetch<unknown>(`/api/communities/${communityId}/suggestions`),
      ),
  });
}

function useInvalidateSuggestions(communityId: string) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({
      queryKey: suggestionsKey(communityId),
    });
  };
}

export function useCreateSuggestion(communityId: string) {
  const invalidate = useInvalidateSuggestions(communityId);
  return useMutation({
    mutationFn: async (input: CreateSuggestionInput) =>
      validated(
        suggestionSchema,
        await apiFetch<unknown>(`/api/communities/${communityId}/suggestions`, {
          method: 'POST',
          body: JSON.stringify(createSuggestionInputSchema.parse(input)),
        }),
      ),
    onSuccess: invalidate,
  });
}

export function useSetSuggestionStatus(communityId: string) {
  const invalidate = useInvalidateSuggestions(communityId);
  return useMutation({
    mutationFn: async (input: { suggestionId: string; status: string }) => {
      const { status } = updateSuggestionStatusInputSchema.parse({
        status: input.status,
      });
      await apiFetch<unknown>(
        `/api/communities/${communityId}/suggestions/${input.suggestionId}`,
        { method: 'PATCH', body: JSON.stringify({ status }) },
      );
    },
    onSuccess: invalidate,
  });
}

export function useDeleteSuggestion(communityId: string) {
  const invalidate = useInvalidateSuggestions(communityId);
  return useMutation({
    mutationFn: async (suggestionId: string) =>
      apiFetch<unknown>(`/api/communities/${communityId}/suggestions/${suggestionId}`, {
        method: 'DELETE',
      }),
    onSuccess: invalidate,
  });
}
