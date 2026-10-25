import { useQuery } from '@tanstack/react-query';
import { communityStatsSchema } from '@comunidad/shared';
import { apiFetch } from '../../lib/api-client';
import { validated } from '../../lib/validated';

export const communityStatsKey = (communityId: string) =>
  ['communities', communityId, 'stats'] as const;

/** Estadísticas de uso (consultas SQL agregadas; ADR 006: sin IA). */
export function useCommunityStats(communityId: string | undefined) {
  return useQuery({
    queryKey: communityStatsKey(communityId ?? 'none'),
    enabled: communityId !== undefined,
    queryFn: async () =>
      validated(
        communityStatsSchema,
        await apiFetch<unknown>(`/api/communities/${communityId}/stats`),
      ),
  });
}
