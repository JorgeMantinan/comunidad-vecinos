import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  communitySponsorSchema,
  createSponsorshipInputSchema,
  sponsorshipSchema,
  updateSponsorshipInputSchema,
} from '@comunidad/shared';
import type { CreateSponsorshipInput, UpdateSponsorshipInput } from '@comunidad/shared';
import { z } from 'zod';
import { apiFetch } from '../../lib/api-client';
import { validated } from '../../lib/validated';

export const platformSponsorshipsKey = ['platform', 'sponsorships'] as const;
export const communitySponsorsKey = (communityId: string) =>
  ['communities', communityId, 'sponsors'] as const;

/** Publicidad activa de la comunidad (cualquier miembro). */
export function useCommunitySponsors(communityId: string | undefined) {
  return useQuery({
    queryKey: communitySponsorsKey(communityId ?? 'none'),
    enabled: communityId !== undefined,
    queryFn: async () =>
      validated(
        z.array(communitySponsorSchema),
        await apiFetch<unknown>(`/api/communities/${communityId}/sponsorships`),
      ),
  });
}

/** Gestión de plataforma (responde 403 a cuentas no autorizadas). */
export function usePlatformSponsorships() {
  return useQuery({
    queryKey: platformSponsorshipsKey,
    retry: false,
    queryFn: async () =>
      validated(
        z.array(sponsorshipSchema),
        await apiFetch<unknown>('/api/platform/sponsorships'),
      ),
  });
}

function useInvalidateSponsorships() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({
      queryKey: platformSponsorshipsKey,
    });
    void queryClient.invalidateQueries({ queryKey: ['communities'] });
  };
}

export function useCreateSponsorship() {
  const invalidate = useInvalidateSponsorships();
  return useMutation({
    mutationFn: async (input: CreateSponsorshipInput) =>
      validated(
        sponsorshipSchema,
        await apiFetch<unknown>('/api/platform/sponsorships', {
          method: 'POST',
          body: JSON.stringify(createSponsorshipInputSchema.parse(input)),
        }),
      ),
    onSuccess: invalidate,
  });
}

export function useUpdateSponsorship() {
  const invalidate = useInvalidateSponsorships();
  return useMutation({
    mutationFn: async (input: {
      sponsorshipId: string;
      changes: UpdateSponsorshipInput;
    }) => {
      await apiFetch<unknown>(`/api/platform/sponsorships/${input.sponsorshipId}`, {
        method: 'PATCH',
        body: JSON.stringify(updateSponsorshipInputSchema.parse(input.changes)),
      });
    },
    onSuccess: invalidate,
  });
}

export function useDeleteSponsorship() {
  const invalidate = useInvalidateSponsorships();
  return useMutation({
    mutationFn: async (sponsorshipId: string) =>
      apiFetch<unknown>(`/api/platform/sponsorships/${sponsorshipId}`, {
        method: 'DELETE',
      }),
    onSuccess: invalidate,
  });
}
