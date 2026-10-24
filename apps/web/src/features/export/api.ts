import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api-client';

/**
 * Exportación inicial: descarga un JSON con todos los datos de la
 * comunidad (derecho de portabilidad; disponible para owner/admin).
 */
export function useExportCommunity(communityId: string) {
  return useMutation({
    mutationFn: async () => {
      const payload = await apiFetch<unknown>(`/api/communities/${communityId}/export`);
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `comunidad-${communityId}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    },
  });
}
