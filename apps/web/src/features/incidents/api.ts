import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createIncidentInputSchema,
  incidentSchema,
  updateIncidentInputSchema,
} from '@comunidad/shared';
import type { CreateIncidentInput, UpdateIncidentInput } from '@comunidad/shared';
import { z } from 'zod';
import { apiFetch } from '../../lib/api-client';
import { validated } from '../../lib/validated';

export const incidentsKey = (communityId: string) =>
  ['communities', communityId, 'incidents'] as const;

export function useIncidents(communityId: string | undefined) {
  return useQuery({
    queryKey: incidentsKey(communityId ?? 'none'),
    enabled: communityId !== undefined,
    queryFn: async () =>
      validated(
        z.array(incidentSchema),
        await apiFetch<unknown>(`/api/communities/${communityId}/incidents`),
      ),
  });
}

function useInvalidateIncidents(communityId: string) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({
      queryKey: incidentsKey(communityId),
    });
  };
}

/** Cualquier miembro puede reportar. */
export function useReportIncident(communityId: string) {
  const invalidate = useInvalidateIncidents(communityId);
  return useMutation({
    mutationFn: async (input: CreateIncidentInput) =>
      validated(
        incidentSchema,
        await apiFetch<unknown>(`/api/communities/${communityId}/incidents`, {
          method: 'POST',
          body: JSON.stringify(createIncidentInputSchema.parse(input)),
        }),
      ),
    onSuccess: invalidate,
  });
}

export function useUpdateIncident(communityId: string) {
  const invalidate = useInvalidateIncidents(communityId);
  return useMutation({
    mutationFn: async (input: { incidentId: string; changes: UpdateIncidentInput }) => {
      await apiFetch<unknown>(
        `/api/communities/${communityId}/incidents/${input.incidentId}`,
        {
          method: 'PATCH',
          body: JSON.stringify(updateIncidentInputSchema.parse(input.changes)),
        },
      );
    },
    onSuccess: invalidate,
  });
}

export function useDeleteIncident(communityId: string) {
  const invalidate = useInvalidateIncidents(communityId);
  return useMutation({
    mutationFn: async (incidentId: string) =>
      apiFetch<unknown>(`/api/communities/${communityId}/incidents/${incidentId}`, {
        method: 'DELETE',
      }),
    onSuccess: invalidate,
  });
}
