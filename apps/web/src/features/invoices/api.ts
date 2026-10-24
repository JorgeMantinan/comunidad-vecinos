import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createInvoiceInputSchema, invoiceSchema } from '@comunidad/shared';
import type { CreateInvoiceInput } from '@comunidad/shared';
import { z } from 'zod';
import { apiFetch } from '../../lib/api-client';
import { validated } from '../../lib/validated';

export const invoicesKey = (communityId: string) =>
  ['communities', communityId, 'invoices'] as const;

export function useInvoices(communityId: string | undefined) {
  return useQuery({
    queryKey: invoicesKey(communityId ?? 'none'),
    enabled: communityId !== undefined,
    queryFn: async () =>
      validated(
        z.array(invoiceSchema),
        await apiFetch<unknown>(`/api/communities/${communityId}/invoices`),
      ),
  });
}

function useInvalidateInvoices(communityId: string) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({
      queryKey: invoicesKey(communityId),
    });
  };
}

export function useCreateInvoice(communityId: string) {
  const invalidate = useInvalidateInvoices(communityId);
  return useMutation({
    mutationFn: async (input: CreateInvoiceInput) =>
      validated(
        invoiceSchema,
        await apiFetch<unknown>(`/api/communities/${communityId}/invoices`, {
          method: 'POST',
          body: JSON.stringify(createInvoiceInputSchema.parse(input)),
        }),
      ),
    onSuccess: invalidate,
  });
}

export function usePayInvoice(communityId: string) {
  const invalidate = useInvalidateInvoices(communityId);
  return useMutation({
    mutationFn: async (invoiceId: string) =>
      apiFetch<unknown>(`/api/communities/${communityId}/invoices/${invoiceId}/pay`, {
        method: 'POST',
        body: '{}',
      }),
    onSuccess: invalidate,
  });
}

export function useDeleteInvoice(communityId: string) {
  const invalidate = useInvalidateInvoices(communityId);
  return useMutation({
    mutationFn: async (invoiceId: string) =>
      apiFetch<unknown>(`/api/communities/${communityId}/invoices/${invoiceId}`, {
        method: 'DELETE',
      }),
    onSuccess: invalidate,
  });
}
