import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createUnitInputSchema, unitSchema } from '@comunidad/shared';
import type { CreateUnitInput } from '@comunidad/shared';
import { z } from 'zod';
import { apiFetch } from '../../lib/api-client';
import { validated } from '../../lib/validated';

export const unitsKey = (communityId: string) =>
  ['communities', communityId, 'units'] as const;

export function useUnits(communityId: string | undefined) {
  return useQuery({
    queryKey: unitsKey(communityId ?? 'none'),
    enabled: communityId !== undefined,
    queryFn: async () =>
      validated(
        z.array(unitSchema),
        await apiFetch<unknown>(`/api/communities/${communityId}/units`),
      ),
  });
}

function useInvalidateUnits(communityId: string) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: unitsKey(communityId) });
    // Las derramas dependen de las unidades.
    void queryClient.invalidateQueries({
      queryKey: ['communities', communityId, 'assessments'],
    });
  };
}

export function useCreateUnit(communityId: string) {
  const invalidate = useInvalidateUnits(communityId);
  return useMutation({
    mutationFn: async (input: CreateUnitInput) =>
      validated(
        unitSchema,
        await apiFetch<unknown>(`/api/communities/${communityId}/units`, {
          method: 'POST',
          body: JSON.stringify(createUnitInputSchema.parse(input)),
        }),
      ),
    onSuccess: invalidate,
  });
}

export function useDeleteUnit(communityId: string) {
  const invalidate = useInvalidateUnits(communityId);
  return useMutation({
    mutationFn: async (unitId: string) =>
      apiFetch<unknown>(`/api/communities/${communityId}/units/${unitId}`, {
        method: 'DELETE',
      }),
    onSuccess: invalidate,
  });
}
