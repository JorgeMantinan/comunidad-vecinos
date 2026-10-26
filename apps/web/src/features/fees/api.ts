import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createFeeTariffInputSchema,
  feeChargeSchema,
  feeTariffSchema,
  generateFeeChargesInputSchema,
  generateFeeChargesResultSchema,
  updateFeeChargeInputSchema,
  updateFeeTariffInputSchema,
} from '@comunidad/shared';
import type {
  CreateFeeTariffInput,
  GenerateFeeChargesInput,
  UpdateFeeChargeInput,
  UpdateFeeTariffInput,
} from '@comunidad/shared';
import { z } from 'zod';
import { apiFetch } from '../../lib/api-client';
import { validated } from '../../lib/validated';

export const feeTariffsKey = (communityId: string) =>
  ['communities', communityId, 'fee-tariffs'] as const;

export const feeChargesKey = (communityId: string) =>
  ['communities', communityId, 'fee-charges'] as const;

function useInvalidateFees(communityId: string) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: feeTariffsKey(communityId) });
    void queryClient.invalidateQueries({ queryKey: feeChargesKey(communityId) });
  };
}

export function useFeeTariffs(communityId: string | undefined) {
  return useQuery({
    queryKey: feeTariffsKey(communityId ?? 'none'),
    enabled: communityId !== undefined,
    queryFn: async () =>
      validated(
        z.array(feeTariffSchema),
        await apiFetch<unknown>(`/api/communities/${communityId}/fee-tariffs`),
      ),
  });
}

export function useFeeCharges(
  communityId: string | undefined,
  period: string,
  enabled = true,
) {
  return useQuery({
    queryKey: [...feeChargesKey(communityId ?? 'none'), period],
    enabled: communityId !== undefined && enabled,
    queryFn: async () =>
      validated(
        z.array(feeChargeSchema),
        await apiFetch<unknown>(
          `/api/communities/${communityId}/fee-charges?period=${encodeURIComponent(period)}`,
        ),
      ),
  });
}

export function useCreateFeeTariff(communityId: string) {
  const invalidate = useInvalidateFees(communityId);
  return useMutation({
    mutationFn: async (input: CreateFeeTariffInput) =>
      validated(
        feeTariffSchema,
        await apiFetch<unknown>(`/api/communities/${communityId}/fee-tariffs`, {
          method: 'POST',
          body: JSON.stringify(createFeeTariffInputSchema.parse(input)),
        }),
      ),
    onSuccess: invalidate,
  });
}

export function useDeleteFeeTariff(communityId: string) {
  const invalidate = useInvalidateFees(communityId);
  return useMutation({
    mutationFn: (tariffId: string) =>
      apiFetch<unknown>(`/api/communities/${communityId}/fee-tariffs/${tariffId}`, {
        method: 'DELETE',
      }),
    onSuccess: invalidate,
  });
}

export function useUpdateFeeTariff(communityId: string) {
  const invalidate = useInvalidateFees(communityId);
  return useMutation({
    mutationFn: (input: { tariffId: string; changes: UpdateFeeTariffInput }) =>
      apiFetch<unknown>(
        `/api/communities/${communityId}/fee-tariffs/${input.tariffId}`,
        {
          method: 'PATCH',
          body: JSON.stringify(updateFeeTariffInputSchema.parse(input.changes)),
        },
      ),
    onSuccess: invalidate,
  });
}

export function useGenerateFeeCharges(communityId: string) {
  const invalidate = useInvalidateFees(communityId);
  return useMutation({
    mutationFn: async (input: GenerateFeeChargesInput) =>
      validated(
        generateFeeChargesResultSchema,
        await apiFetch<unknown>(
          `/api/communities/${communityId}/fee-charges/generate`,
          {
            method: 'POST',
            body: JSON.stringify(generateFeeChargesInputSchema.parse(input)),
          },
        ),
      ),
    onSuccess: invalidate,
  });
}

export function useSetFeeChargeStatus(communityId: string) {
  const invalidate = useInvalidateFees(communityId);
  return useMutation({
    mutationFn: (input: { chargeId: string; changes: UpdateFeeChargeInput }) =>
      apiFetch<unknown>(
        `/api/communities/${communityId}/fee-charges/${input.chargeId}`,
        {
          method: 'PATCH',
          body: JSON.stringify(updateFeeChargeInputSchema.parse(input.changes)),
        },
      ),
    onSuccess: invalidate,
  });
}
