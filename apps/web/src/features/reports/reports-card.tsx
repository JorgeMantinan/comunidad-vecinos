import { useState } from 'react';
import type { CommunityRole } from '@comunidad/shared';
import { Button, Card, ErrorAlert, Field, Input, Spinner } from '../../components/ui';
import { formatEuro } from '../expenses/api';
import {
  defaultPeriod,
  useDownloadEconomyCsv,
  useEconomyReport,
  type ReportPeriod,
} from './api';

const categoryLabels: Record<string, string> = {
  community: 'Comunidad',
  administration: 'Administración',
  repair: 'Reparaciones',
  supply: 'Suministros',
  other: 'Otros',
};

/**
 * Informe económico por periodo (agregaciones SQL, sin IA): resumen y
 * descarga CSV para owner/admin.
 */
export function EconomyReportCard({
  communityId,
  role,
}: {
  communityId: string;
  role: CommunityRole;
}) {
  const [period, setPeriod] = useState<ReportPeriod>(defaultPeriod);
  const report = useEconomyReport(communityId, period);
  const download = useDownloadEconomyCsv(communityId);
  const isAdmin = role === 'owner' || role === 'admin';

  return (
    <Card title="Informe económico del periodo">
      {report.error ? <ErrorAlert message={report.error.message} /> : null}
      {download.error ? <ErrorAlert message={download.error.message} /> : null}

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-44">
          <Field label="Desde" htmlFor="report-from">
            <Input
              id="report-from"
              type="date"
              value={period.from}
              onChange={(event) =>
                setPeriod((current) => ({ ...current, from: event.target.value }))
              }
            />
          </Field>
        </div>
        <div className="w-44">
          <Field label="Hasta" htmlFor="report-to">
            <Input
              id="report-to"
              type="date"
              value={period.to}
              onChange={(event) =>
                setPeriod((current) => ({ ...current, to: event.target.value }))
              }
            />
          </Field>
        </div>
        {isAdmin ? (
          <div className="pb-4">
            <Button
              variant="secondary"
              onClick={() => download.mutate(period)}
              disabled={download.isPending}
            >
              {download.isPending ? 'Descargando…' : 'Descargar CSV'}
            </Button>
          </div>
        ) : null}
      </div>

      {report.isLoading ? <Spinner /> : null}
      {report.data ? (
        <div className="grid gap-4 text-sm md:grid-cols-3">
          <div className="rounded-lg bg-accent-soft/40 p-3">
            <p className="text-xs uppercase text-subtle">Gastos</p>
            <p className="text-lg font-semibold text-primary">
              {formatEuro(report.data.expenses.total)}
            </p>
            <p className="text-xs text-muted">
              {report.data.expenses.count} apunte
              {report.data.expenses.count === 1 ? '' : 's'} · pendiente{' '}
              {formatEuro(report.data.expenses.pendingTotal)}
            </p>
          </div>
          <div className="rounded-lg bg-accent-soft/40 p-3">
            <p className="text-xs uppercase text-subtle">Pagado</p>
            <p className="text-lg font-semibold text-primary">
              {formatEuro(report.data.expenses.paidTotal)}
            </p>
            <p className="text-xs text-muted">
              facturas: {report.data.invoices.count} por{' '}
              {formatEuro(report.data.invoices.total)}
            </p>
          </div>
          <div className="rounded-lg bg-accent-soft/40 p-3">
            <p className="text-xs uppercase text-subtle">Por categoría</p>
            <ul className="mt-1 space-y-0.5 text-xs text-body">
              {report.data.expenses.byCategory.map((row) => (
                <li key={row.category} className="flex justify-between gap-2">
                  <span>{categoryLabels[row.category] ?? row.category}</span>
                  <span className="font-medium">{formatEuro(row.total)}</span>
                </li>
              ))}
              {report.data.expenses.byCategory.length === 0 ? (
                <li className="text-subtle">Sin gastos en el periodo</li>
              ) : null}
            </ul>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
