import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createExpenseInputSchema,
  expenseSchema,
  payExpenseInputSchema,
} from '@comunidad/shared';
import type { CreateExpenseInput } from '@comunidad/shared';
import { z } from 'zod';
import { apiFetch } from '../../lib/api-client';
import { validated } from '../../lib/validated';

export const expensesKey = (communityId: string) =>
  ['communities', communityId, 'expenses'] as const;

export function useExpenses(communityId: string | undefined, limit?: number) {
  return useQuery({
    queryKey: [...expensesKey(communityId ?? 'none'), limit ?? 'all'],
    enabled: communityId !== undefined,
    queryFn: async () =>
      validated(
        z.array(expenseSchema),
        await apiFetch<unknown>(
          `/api/communities/${communityId}/expenses${limit ? `?limit=${limit}` : ''}`,
        ),
      ),
  });
}

function useInvalidateExpenses(communityId: string) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({
      queryKey: expensesKey(communityId),
    });
  };
}

export function useCreateExpense(communityId: string) {
  const invalidate = useInvalidateExpenses(communityId);
  return useMutation({
    mutationFn: async (input: CreateExpenseInput) =>
      validated(
        expenseSchema,
        await apiFetch<unknown>(`/api/communities/${communityId}/expenses`, {
          method: 'POST',
          body: JSON.stringify(createExpenseInputSchema.parse(input)),
        }),
      ),
    onSuccess: invalidate,
  });
}

export function usePayExpense(communityId: string) {
  const invalidate = useInvalidateExpenses(communityId);
  return useMutation({
    mutationFn: async (expenseId: string) =>
      apiFetch<unknown>(`/api/communities/${communityId}/expenses/${expenseId}/pay`, {
        method: 'POST',
        body: JSON.stringify(payExpenseInputSchema.parse({})),
      }),
    onSuccess: invalidate,
  });
}

export function useDeleteExpense(communityId: string) {
  const invalidate = useInvalidateExpenses(communityId);
  return useMutation({
    mutationFn: async (expenseId: string) =>
      apiFetch<unknown>(`/api/communities/${communityId}/expenses/${expenseId}`, {
        method: 'DELETE',
      }),
    onSuccess: invalidate,
  });
}

/** Formatea un decimal exacto como importe en euros. */
export const formatEuro = (amount: string): string =>
  new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(Number(amount));
