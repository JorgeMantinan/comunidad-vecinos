import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { DeleteAccountResult } from '@comunidad/shared';
import { deleteAccountInputSchema } from '@comunidad/shared';
import { apiFetch } from '../../lib/api-client';

/**
 * Descarga de los datos personales (derecho de acceso y portabilidad).
 * El JSON se genera en el servidor y solo contiene datos del usuario.
 */
export function usePersonalExport() {
  return useMutation({
    mutationFn: async () => {
      const payload = await apiFetch<unknown>('/api/account/export');
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `mis-datos-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    },
  });
}

/** Baja de la cuenta: exige contraseña y la frase ELIMINAR. */
export function useDeleteAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { password: string; confirm: string }) =>
      apiFetch<DeleteAccountResult>('/api/account', {
        method: 'DELETE',
        body: JSON.stringify(deleteAccountInputSchema.parse(input)),
      }),
    onSuccess: () => {
      // La sesión ya no existe en el servidor: se vacía la caché entera.
      queryClient.clear();
    },
  });
}
