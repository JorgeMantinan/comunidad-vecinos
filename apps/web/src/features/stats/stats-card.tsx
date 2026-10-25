import { Card, ErrorAlert, Spinner } from '../../components/ui';
import { formatEuro } from '../expenses/api';
import { useCommunityStats } from './api';

const entries = (stats: {
  members: number;
  units: number;
  announcements: number;
  meetings: number;
  suggestions: number;
  professionals: number;
  documents: number;
  templates: number;
  assessments: number;
  recentActivity: number;
  incidents: { total: number; open: number };
  tasks: { total: number; done: number };
  expenses: { count: number; total: string; paidTotal: string };
  invoices: { count: number; total: string };
}): Array<{ label: string; value: string }> => [
  { label: 'Miembros', value: String(stats.members) },
  { label: 'Unidades', value: String(stats.units) },
  { label: 'Avisos', value: String(stats.announcements) },
  { label: 'Reuniones', value: String(stats.meetings) },
  {
    label: 'Incidencias (abiertas/total)',
    value: `${stats.incidents.open}/${stats.incidents.total}`,
  },
  {
    label: 'Tareas (hechas/total)',
    value: `${stats.tasks.done}/${stats.tasks.total}`,
  },
  { label: 'Sugerencias', value: String(stats.suggestions) },
  { label: 'Profesionales', value: String(stats.professionals) },
  { label: 'Documentos', value: String(stats.documents) },
  { label: 'Plantillas', value: String(stats.templates) },
  { label: 'Derramas', value: String(stats.assessments) },
  {
    label: 'Gasto total / pagado',
    value: `${formatEuro(stats.expenses.total)} / ${formatEuro(stats.expenses.paidTotal)}`,
  },
  { label: 'Facturas', value: formatEuro(stats.invoices.total) },
  { label: 'Actividad (30 días)', value: String(stats.recentActivity) },
];

/**
 * Estadísticas de uso de la comunidad: agregaciones SQL directas
 * (ADR 006: sin IA, sin coste por consulta).
 */
export function StatsCard({ communityId }: { communityId: string }) {
  const stats = useCommunityStats(communityId);

  return (
    <Card title="Estadísticas de uso">
      {stats.error ? <ErrorAlert message={stats.error.message} /> : null}
      {stats.isLoading ? <Spinner /> : null}
      {stats.data ? (
        <>
          <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {entries(stats.data).map((entry) => (
              <div key={entry.label} className="rounded-lg bg-accent-soft/40 p-3">
                <dt className="text-xs text-subtle">{entry.label}</dt>
                <dd className="text-lg font-semibold text-primary">{entry.value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-subtle">
            Cálculos locales sobre la base de datos de la comunidad, sin servicios
            externos (ADR 006: sin IA).
          </p>
        </>
      ) : null}
    </Card>
  );
}
