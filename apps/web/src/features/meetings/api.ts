import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createAgendaItemInputSchema,
  createAgreementInputSchema,
  createMeetingInputSchema,
  meetingDetailSchema,
  meetingSchema,
  updateAgreementStatusInputSchema,
  updateMeetingInputSchema,
} from '@comunidad/shared';
import type {
  CreateAgendaItemInput,
  CreateAgreementInput,
  CreateMeetingInput,
  UpdateMeetingInput,
} from '@comunidad/shared';
import { z } from 'zod';
import { apiFetch } from '../../lib/api-client';
import { validated } from '../../lib/validated';

export const meetingsKey = (communityId: string) =>
  ['communities', communityId, 'meetings'] as const;

export const meetingKey = (communityId: string, meetingId: string) =>
  ['communities', communityId, 'meetings', meetingId] as const;

export function useMeetings(communityId: string | undefined) {
  return useQuery({
    queryKey: meetingsKey(communityId ?? 'none'),
    enabled: communityId !== undefined,
    queryFn: async () =>
      validated(
        z.array(meetingSchema),
        await apiFetch<unknown>(`/api/communities/${communityId}/meetings`),
      ),
  });
}

export function useMeetingDetail(
  communityId: string | undefined,
  meetingId: string | undefined,
) {
  return useQuery({
    queryKey: meetingKey(communityId ?? 'none', meetingId ?? 'none'),
    enabled: communityId !== undefined && meetingId !== undefined,
    queryFn: async () =>
      validated(
        meetingDetailSchema,
        await apiFetch<unknown>(
          `/api/communities/${communityId}/meetings/${meetingId}`,
        ),
      ),
  });
}

function useInvalidateMeetings(communityId: string) {
  const queryClient = useQueryClient();
  return (meetingId?: string) => {
    void queryClient.invalidateQueries({
      queryKey: meetingsKey(communityId),
    });
    if (meetingId) {
      void queryClient.invalidateQueries({
        queryKey: meetingKey(communityId, meetingId),
      });
    }
  };
}

export function useCreateMeeting(communityId: string) {
  const invalidate = useInvalidateMeetings(communityId);
  return useMutation({
    mutationFn: async (input: CreateMeetingInput) =>
      validated(
        meetingSchema,
        await apiFetch<unknown>(`/api/communities/${communityId}/meetings`, {
          method: 'POST',
          body: JSON.stringify(createMeetingInputSchema.parse(input)),
        }),
      ),
    onSuccess: (meeting) => invalidate(meeting.id),
  });
}

export function useUpdateMeeting(communityId: string) {
  const invalidate = useInvalidateMeetings(communityId);
  return useMutation({
    mutationFn: async (input: { meetingId: string; changes: UpdateMeetingInput }) => {
      await apiFetch<unknown>(
        `/api/communities/${communityId}/meetings/${input.meetingId}`,
        {
          method: 'PATCH',
          body: JSON.stringify(updateMeetingInputSchema.parse(input.changes)),
        },
      );
      return input.meetingId;
    },
    onSuccess: (meetingId) => invalidate(meetingId),
  });
}

export function useDeleteMeeting(communityId: string) {
  const invalidate = useInvalidateMeetings(communityId);
  return useMutation({
    mutationFn: async (meetingId: string) =>
      apiFetch<unknown>(`/api/communities/${communityId}/meetings/${meetingId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => invalidate(),
  });
}

export function useAddAgendaItem(communityId: string, meetingId: string) {
  const invalidate = useInvalidateMeetings(communityId);
  return useMutation({
    mutationFn: async (input: CreateAgendaItemInput) =>
      apiFetch<unknown>(
        `/api/communities/${communityId}/meetings/${meetingId}/agenda`,
        {
          method: 'POST',
          body: JSON.stringify(createAgendaItemInputSchema.parse(input)),
        },
      ),
    onSuccess: () => invalidate(meetingId),
  });
}

export function useDeleteAgendaItem(communityId: string, meetingId: string) {
  const invalidate = useInvalidateMeetings(communityId);
  return useMutation({
    mutationFn: async (itemId: string) =>
      apiFetch<unknown>(
        `/api/communities/${communityId}/meetings/${meetingId}/agenda/${itemId}`,
        { method: 'DELETE' },
      ),
    onSuccess: () => invalidate(meetingId),
  });
}

export function useAddAgreement(communityId: string, meetingId: string) {
  const invalidate = useInvalidateMeetings(communityId);
  return useMutation({
    mutationFn: async (input: CreateAgreementInput) =>
      apiFetch<unknown>(
        `/api/communities/${communityId}/meetings/${meetingId}/agreements`,
        {
          method: 'POST',
          body: JSON.stringify(createAgreementInputSchema.parse(input)),
        },
      ),
    onSuccess: () => invalidate(meetingId),
  });
}

export function useSetAgreementStatus(communityId: string, meetingId: string) {
  const invalidate = useInvalidateMeetings(communityId);
  return useMutation({
    mutationFn: async (input: { agreementId: string; status: string }) => {
      const { status } = updateAgreementStatusInputSchema.parse({
        status: input.status,
      });
      await apiFetch<unknown>(
        `/api/communities/${communityId}/meetings/${meetingId}/agreements/${input.agreementId}`,
        { method: 'PATCH', body: JSON.stringify({ status }) },
      );
    },
    onSuccess: () => invalidate(meetingId),
  });
}
