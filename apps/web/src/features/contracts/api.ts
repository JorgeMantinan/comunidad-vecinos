import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  contractSchema,
  createContractInputSchema,
  updateContractInputSchema,
} from '@comunidad/shared';
import type { CreateContractInput, UpdateContractInput } from '@comunidad/shared';
import { z } from 'zod';
import { apiFetch } from '../../lib/api-client';
import { validated } from '../../lib/validated';

export const contractsKey = (communityId: string) =>
  ['communities', communityId, 'contracts'] as const;

export function useContracts(communityId: string | undefined) {
  return useQuery({
    queryKey: contractsKey(communityId ?? 'none'),
    enabled: communityId !== undefined,
    queryFn: async () =>
      validated(
        z.array(contractSchema),
        await apiFetch<unknown>(`/api/communities/${communityId}/contracts`),
      ),
  });
}

function useInvalidateContracts(communityId: string) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({
      queryKey: contractsKey(communityId),
    });
  };
}

export function useCreateContract(communityId: string) {
  const invalidate = useInvalidateContracts(communityId);
  return useMutation({
    mutationFn: async (input: CreateContractInput) =>
      validated(
        contractSchema,
        await apiFetch<unknown>(`/api/communities/${communityId}/contracts`, {
          method: 'POST',
          body: JSON.stringify(createContractInputSchema.parse(input)),
        }),
      ),
    onSuccess: invalidate,
  });
}

export function useUpdateContract(communityId: string) {
  const invalidate = useInvalidateContracts(communityId);
  return useMutation({
    mutationFn: async (input: { contractId: string; changes: UpdateContractInput }) => {
      await apiFetch<unknown>(
        `/api/communities/${communityId}/contracts/${input.contractId}`,
        {
          method: 'PATCH',
          body: JSON.stringify(updateContractInputSchema.parse(input.changes)),
        },
      );
    },
    onSuccess: invalidate,
  });
}

export function useDeleteContract(communityId: string) {
  const invalidate = useInvalidateContracts(communityId);
  return useMutation({
    mutationFn: async (contractId: string) =>
      apiFetch<unknown>(`/api/communities/${communityId}/contracts/${contractId}`, {
        method: 'DELETE',
      }),
    onSuccess: invalidate,
  });
}
