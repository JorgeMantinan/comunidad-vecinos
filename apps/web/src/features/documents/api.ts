import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { documentSchema, uploadDocumentInputSchema } from '@comunidad/shared';
import type { UploadDocumentInput } from '@comunidad/shared';
import { z } from 'zod';
import { apiFetch } from '../../lib/api-client';
import { validated } from '../../lib/validated';

export const documentsKey = (communityId: string) =>
  ['communities', communityId, 'documents'] as const;

export function useDocuments(communityId: string | undefined) {
  return useQuery({
    queryKey: documentsKey(communityId ?? 'none'),
    enabled: communityId !== undefined,
    queryFn: async () =>
      validated(
        z.array(documentSchema),
        await apiFetch<unknown>(`/api/communities/${communityId}/documents`),
      ),
  });
}

function useInvalidateDocuments(communityId: string) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({
      queryKey: documentsKey(communityId),
    });
  };
}

export function useUploadDocument(communityId: string) {
  const invalidate = useInvalidateDocuments(communityId);
  return useMutation({
    mutationFn: async (input: UploadDocumentInput) =>
      validated(
        documentSchema,
        await apiFetch<unknown>(`/api/communities/${communityId}/documents`, {
          method: 'POST',
          body: JSON.stringify(uploadDocumentInputSchema.parse(input)),
        }),
      ),
    onSuccess: invalidate,
  });
}

/** Pide la URL firmada (10 min) y la abre en una pestaña nueva. */
export function useDownloadDocument() {
  return useMutation({
    mutationFn: async (input: { communityId: string; documentId: string }) => {
      const { url } = await apiFetch<{ url: string }>(
        `/api/communities/${input.communityId}/documents/${input.documentId}/download`,
      );
      window.open(url, '_blank', 'noopener');
      return url;
    },
  });
}

export function useDeleteDocument(communityId: string) {
  const invalidate = useInvalidateDocuments(communityId);
  return useMutation({
    mutationFn: async (documentId: string) =>
      apiFetch<unknown>(`/api/communities/${communityId}/documents/${documentId}`, {
        method: 'DELETE',
      }),
    onSuccess: invalidate,
  });
}
