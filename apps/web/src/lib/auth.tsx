import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './api-client';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
}

interface SessionResponse {
  user: SessionUser;
  session: { id: string; expiresAt: string };
}

const sessionKey = ['session'] as const;

/** Sesión actual; `null` cuando no hay sesión válida. */
export function useSession() {
  return useQuery({
    queryKey: sessionKey,
    retry: false,
    staleTime: 60_000,
    queryFn: async () => {
      try {
        return await apiFetch<SessionResponse>('/api/auth/get-session');
      } catch {
        return null;
      }
    },
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { email: string; password: string }) =>
      apiFetch<SessionResponse>('/api/auth/sign-in/email', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    // Espera a refrescar la sesión: si no, `RequireAuth` leería el
    // `null` cacheado y rebotaría al usuario a /login.
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: sessionKey });
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; email: string; password: string }) =>
      apiFetch<SessionResponse>('/api/auth/sign-up/email', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: sessionKey });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ status: boolean }>('/api/auth/sign-out', { method: 'POST' }),
    onSuccess: () => {
      queryClient.clear();
    },
  });
}
