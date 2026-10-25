import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createTemplateInputSchema,
  documentSchema,
  documentTemplateSchema,
  generateDocumentInputSchema,
  updateTemplateInputSchema,
} from '@comunidad/shared';
import type { CreateTemplateInput } from '@comunidad/shared';
import { z } from 'zod';
import { apiFetch } from '../../lib/api-client';
import { validated } from '../../lib/validated';

export const templatesKey = (communityId: string) =>
  ['communities', communityId, 'templates'] as const;

export function useTemplates(communityId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: templatesKey(communityId ?? 'none'),
    enabled: communityId !== undefined && enabled,
    queryFn: async () =>
      validated(
        z.array(documentTemplateSchema),
        await apiFetch<unknown>(`/api/communities/${communityId}/templates`),
      ),
  });
}

function useInvalidateTemplates(communityId: string) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({
      queryKey: templatesKey(communityId),
    });
  };
}

export function useSaveTemplate(communityId: string) {
  const invalidate = useInvalidateTemplates(communityId);
  return useMutation({
    mutationFn: async (input: {
      templateId: string | null;
      values: CreateTemplateInput;
    }) => {
      if (input.templateId) {
        await apiFetch<unknown>(
          `/api/communities/${communityId}/templates/${input.templateId}`,
          {
            method: 'PATCH',
            body: JSON.stringify(updateTemplateInputSchema.parse(input.values)),
          },
        );
        return input.templateId;
      }
      const created = await apiFetch<{ id: string }>(
        `/api/communities/${communityId}/templates`,
        {
          method: 'POST',
          body: JSON.stringify(createTemplateInputSchema.parse(input.values)),
        },
      );
      return created.id;
    },
    onSuccess: invalidate,
  });
}

export function useDeleteTemplate(communityId: string) {
  const invalidate = useInvalidateTemplates(communityId);
  return useMutation({
    mutationFn: async (templateId: string) =>
      apiFetch<unknown>(`/api/communities/${communityId}/templates/${templateId}`, {
        method: 'DELETE',
      }),
    onSuccess: invalidate,
  });
}

/** Genera un documento en el almacén privado a partir de la plantilla. */
export function useGenerateDocument(communityId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (templateId: string) =>
      validated(
        documentSchema,
        await apiFetch<unknown>(
          `/api/communities/${communityId}/templates/${templateId}/generate`,
          {
            method: 'POST',
            body: JSON.stringify(generateDocumentInputSchema.parse({})),
          },
        ),
      ),
    onSuccess: (document) => {
      void queryClient.invalidateQueries({
        queryKey: ['communities', communityId, 'documents'],
      });
      return document;
    },
  });
}
