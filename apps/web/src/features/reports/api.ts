import { useMutation, useQuery } from '@tanstack/react-query';
import { economyReportSchema } from '@comunidad/shared';
import { apiFetch } from '../../lib/api-client';
import { validated } from '../../lib/validated';

export interface ReportPeriod {
  from: string;
  to: string;
}

export const economyReportKey = (communityId: string, from: string, to: string) =>
  ['communities', communityId, 'reports', 'economy', from, to] as const;

const defaultPeriod = (): ReportPeriod => {
  const today = new Date().toISOString().slice(0, 10);
  return { from: `${new Date().getFullYear()}-01-01`, to: today };
};

export function useEconomyReport(
  communityId: string | undefined,
  period: ReportPeriod,
) {
  return useQuery({
    queryKey: economyReportKey(communityId ?? 'none', period.from, period.to),
    enabled: communityId !== undefined,
    queryFn: async () =>
      validated(
        economyReportSchema,
        await apiFetch<unknown>(
          `/api/communities/${communityId}/reports/economy?from=${period.from}&to=${period.to}`,
        ),
      ),
  });
}

export { defaultPeriod };

/** Descarga el CSV del periodo (solo owner/admin). */
export function useDownloadEconomyCsv(communityId: string) {
  return useMutation({
    mutationFn: async (period: ReportPeriod) => {
      const response = await fetch(
        `/api/communities/${communityId}/reports/economy.csv?from=${period.from}&to=${period.to}`,
        { credentials: 'include' },
      );
      if (!response.ok) {
        throw new Error('No se pudo descargar el informe');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `informe-economico-${period.from}-${period.to}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    },
  });
}
