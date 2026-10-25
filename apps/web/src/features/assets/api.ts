import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  assetSchema,
  createAssetInputSchema,
  updateAssetInputSchema,
} from '@comunidad/shared';
import type { CreateAssetInput, UpdateAssetInput } from '@comunidad/shared';
import { z } from 'zod';
import { apiFetch } from '../../lib/api-client';
import { validated } from '../../lib/validated';

export const assetsKey = (communityId: string) =>
  ['communities', communityId, 'assets'] as const;

export function useAssets(communityId: string | undefined) {
  return useQuery({
    queryKey: assetsKey(communityId ?? 'none'),
    enabled: communityId !== undefined,
    queryFn: async () =>
      validated(
        z.array(assetSchema),
        await apiFetch<unknown>(`/api/communities/${communityId}/assets`),
      ),
  });
}

function useInvalidateAssets(communityId: string) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: assetsKey(communityId) });
  };
}

export function useCreateAsset(communityId: string) {
  const invalidate = useInvalidateAssets(communityId);
  return useMutation({
    mutationFn: async (input: CreateAssetInput) =>
      validated(
        assetSchema,
        await apiFetch<unknown>(`/api/communities/${communityId}/assets`, {
          method: 'POST',
          body: JSON.stringify(createAssetInputSchema.parse(input)),
        }),
      ),
    onSuccess: invalidate,
  });
}

export function useUpdateAsset(communityId: string) {
  const invalidate = useInvalidateAssets(communityId);
  return useMutation({
    mutationFn: async (input: { assetId: string; changes: UpdateAssetInput }) => {
      await apiFetch<unknown>(
        `/api/communities/${communityId}/assets/${input.assetId}`,
        {
          method: 'PATCH',
          body: JSON.stringify(updateAssetInputSchema.parse(input.changes)),
        },
      );
    },
    onSuccess: invalidate,
  });
}

export function useDeleteAsset(communityId: string) {
  const invalidate = useInvalidateAssets(communityId);
  return useMutation({
    mutationFn: async (assetId: string) =>
      apiFetch<unknown>(`/api/communities/${communityId}/assets/${assetId}`, {
        method: 'DELETE',
      }),
    onSuccess: invalidate,
  });
}
