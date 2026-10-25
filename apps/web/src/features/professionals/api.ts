import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createProfessionalInputSchema,
  professionalSchema,
  updateProfessionalInputSchema,
} from '@comunidad/shared';
import type {
  CreateProfessionalInput,
  UpdateProfessionalInput,
} from '@comunidad/shared';
import { z } from 'zod';
import { apiFetch } from '../../lib/api-client';
import { validated } from '../../lib/validated';

export const professionalsKey = (communityId: string) =>
  ['communities', communityId, 'professionals'] as const;

export function useProfessionals(communityId: string | undefined) {
  return useQuery({
    queryKey: professionalsKey(communityId ?? 'none'),
    enabled: communityId !== undefined,
    queryFn: async () =>
      validated(
        z.array(professionalSchema),
        await apiFetch<unknown>(`/api/communities/${communityId}/professionals`),
      ),
  });
}

function useInvalidateProfessionals(communityId: string) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({
      queryKey: professionalsKey(communityId),
    });
  };
}

export function useCreateProfessional(communityId: string) {
  const invalidate = useInvalidateProfessionals(communityId);
  return useMutation({
    mutationFn: async (input: CreateProfessionalInput) =>
      validated(
        professionalSchema,
        await apiFetch<unknown>(`/api/communities/${communityId}/professionals`, {
          method: 'POST',
          body: JSON.stringify(createProfessionalInputSchema.parse(input)),
        }),
      ),
    onSuccess: invalidate,
  });
}

export function useUpdateProfessional(communityId: string) {
  const invalidate = useInvalidateProfessionals(communityId);
  return useMutation({
    mutationFn: async (input: {
      professionalId: string;
      changes: UpdateProfessionalInput;
    }) => {
      await apiFetch<unknown>(
        `/api/communities/${communityId}/professionals/${input.professionalId}`,
        {
          method: 'PATCH',
          body: JSON.stringify(updateProfessionalInputSchema.parse(input.changes)),
        },
      );
    },
    onSuccess: invalidate,
  });
}

export function useDeleteProfessional(communityId: string) {
  const invalidate = useInvalidateProfessionals(communityId);
  return useMutation({
    mutationFn: async (professionalId: string) =>
      apiFetch<unknown>(
        `/api/communities/${communityId}/professionals/${professionalId}`,
        { method: 'DELETE' },
      ),
    onSuccess: invalidate,
  });
}
