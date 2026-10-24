import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createTaskInputSchema,
  taskSchema,
  updateTaskInputSchema,
} from '@comunidad/shared';
import type { CreateTaskInput, UpdateTaskInput } from '@comunidad/shared';
import { z } from 'zod';
import { apiFetch } from '../../lib/api-client';
import { validated } from '../../lib/validated';

export const tasksKey = (communityId: string) =>
  ['communities', communityId, 'tasks'] as const;

export function useTasks(communityId: string | undefined) {
  return useQuery({
    queryKey: tasksKey(communityId ?? 'none'),
    enabled: communityId !== undefined,
    queryFn: async () =>
      validated(
        z.array(taskSchema),
        await apiFetch<unknown>(`/api/communities/${communityId}/tasks`),
      ),
  });
}

function useInvalidateTasks(communityId: string) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: tasksKey(communityId) });
  };
}

export function useCreateTask(communityId: string) {
  const invalidate = useInvalidateTasks(communityId);
  return useMutation({
    mutationFn: async (input: CreateTaskInput) =>
      validated(
        taskSchema,
        await apiFetch<unknown>(`/api/communities/${communityId}/tasks`, {
          method: 'POST',
          body: JSON.stringify(createTaskInputSchema.parse(input)),
        }),
      ),
    onSuccess: invalidate,
  });
}

export function useUpdateTask(communityId: string) {
  const invalidate = useInvalidateTasks(communityId);
  return useMutation({
    mutationFn: async (input: { taskId: string; changes: UpdateTaskInput }) => {
      await apiFetch<unknown>(`/api/communities/${communityId}/tasks/${input.taskId}`, {
        method: 'PATCH',
        body: JSON.stringify(updateTaskInputSchema.parse(input.changes)),
      });
    },
    onSuccess: invalidate,
  });
}

export function useDeleteTask(communityId: string) {
  const invalidate = useInvalidateTasks(communityId);
  return useMutation({
    mutationFn: async (taskId: string) =>
      apiFetch<unknown>(`/api/communities/${communityId}/tasks/${taskId}`, {
        method: 'DELETE',
      }),
    onSuccess: invalidate,
  });
}
