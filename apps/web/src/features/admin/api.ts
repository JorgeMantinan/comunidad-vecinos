import { useQuery } from '@tanstack/react-query';
import { adminOverviewSchema } from '@comunidad/shared';
import { apiFetch } from '../../lib/api-client';
import { validated } from '../../lib/validated';

export const adminOverviewKey = ['admin', 'overview'] as const;

/** Comunidades donde el usuario es owner/admin, con métricas. */
export function useAdminOverview(enabled: boolean) {
  return useQuery({
    queryKey: adminOverviewKey,
    enabled,
    queryFn: async () =>
      validated(adminOverviewSchema, await apiFetch<unknown>('/api/admin/overview')),
  });
}
