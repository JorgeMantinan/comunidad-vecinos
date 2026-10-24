import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  assessmentDetailSchema,
  assessmentSchema,
  createAssessmentInputSchema,
} from '@comunidad/shared';
import type { CreateAssessmentInput } from '@comunidad/shared';
import { z } from 'zod';
import { apiFetch } from '../../lib/api-client';
import { validated } from '../../lib/validated';

export const assessmentsKey = (communityId: string) =>
  ['communities', communityId, 'assessments'] as const;

export const assessmentKey = (communityId: string, assessmentId: string) =>
  ['communities', communityId, 'assessments', assessmentId] as const;

export function useAssessments(communityId: string | undefined) {
  return useQuery({
    queryKey: assessmentsKey(communityId ?? 'none'),
    enabled: communityId !== undefined,
    queryFn: async () =>
      validated(
        z.array(assessmentSchema),
        await apiFetch<unknown>(`/api/communities/${communityId}/assessments`),
      ),
  });
}

export function useAssessmentDetail(
  communityId: string | undefined,
  assessmentId: string | null,
) {
  return useQuery({
    queryKey: assessmentKey(communityId ?? 'none', assessmentId ?? 'none'),
    enabled: communityId !== undefined && assessmentId !== null,
    queryFn: async () =>
      validated(
        assessmentDetailSchema,
        await apiFetch<unknown>(
          `/api/communities/${communityId}/assessments/${assessmentId}`,
        ),
      ),
  });
}

function useInvalidateAssessments(communityId: string) {
  const queryClient = useQueryClient();
  return (assessmentId?: string) => {
    void queryClient.invalidateQueries({
      queryKey: assessmentsKey(communityId),
    });
    if (assessmentId) {
      void queryClient.invalidateQueries({
        queryKey: assessmentKey(communityId, assessmentId),
      });
    }
  };
}

export function useCreateAssessment(communityId: string) {
  const invalidate = useInvalidateAssessments(communityId);
  return useMutation({
    mutationFn: async (input: CreateAssessmentInput) =>
      validated(
        assessmentDetailSchema,
        await apiFetch<unknown>(`/api/communities/${communityId}/assessments`, {
          method: 'POST',
          body: JSON.stringify(createAssessmentInputSchema.parse(input)),
        }),
      ),
    onSuccess: (detail) => invalidate(detail.id),
  });
}

export function usePayCharge(communityId: string) {
  const invalidate = useInvalidateAssessments(communityId);
  return useMutation({
    mutationFn: async (input: { assessmentId: string; chargeId: string }) =>
      apiFetch<unknown>(
        `/api/communities/${communityId}/assessments/${input.assessmentId}/charges/${input.chargeId}/pay`,
        { method: 'POST', body: '{}' },
      ),
    onSuccess: (_data, variables) => invalidate(variables.assessmentId),
  });
}

export function useDeleteAssessment(communityId: string) {
  const invalidate = useInvalidateAssessments(communityId);
  return useMutation({
    mutationFn: async (assessmentId: string) =>
      apiFetch<unknown>(`/api/communities/${communityId}/assessments/${assessmentId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => invalidate(),
  });
}
