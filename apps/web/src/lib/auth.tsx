import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, ApiError } from './api-client';

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
    mutationFn: async () => {
      try {
        await apiFetch<{ success: boolean }>('/api/auth/sign-out', {
          method: 'POST',
          // Better Auth exige un cuerpo JSON: sin él responde
          // 400 "Invalid JSON in request body" y la sesión no se cerraba
          // (el botón parecía no hacer nada).
          body: JSON.stringify({}),
        });
      } catch (error: unknown) {
        // Si la sesión ya no existía, para el usuario también es «fuera».
        if (error instanceof ApiError && error.status === 401) {
          return { success: true };
        }
        throw error;
      }
      return { success: true };
    },
    onSuccess: () => {
      queryClient.clear();
    },
  });
}

/**
 * Acceso con Google. Better Auth devuelve la URL de consentimiento y el
 * navegador sale hacia Google; el callback vuelve a **esta misma
 * origin** (`/api/auth/callback/google`) y establece la cookie de
 * sesión. Si el servidor no tiene credenciales, responde 404 y el
 * botón no llega a mostrarse (la interfaz lo consulta en `/api/health`).
 */
export function useGoogleLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const result = await apiFetch<{ url: string; redirect: boolean }>(
        '/api/auth/sign-in/social',
        {
          method: 'POST',
          body: JSON.stringify({ provider: 'google', callbackURL: '/' }),
        },
      );
      window.location.assign(result.url);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: sessionKey });
    },
  });
}
