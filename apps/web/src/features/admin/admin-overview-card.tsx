import { Link } from 'react-router-dom';
import { Button, Card, ErrorAlert, RoleBadge, Spinner } from '../../components/ui';
import { formatEuro } from '../expenses/api';
import { useAdminOverview } from './api';

/**
 * Panel de administración de fincas: una fila por comunidad gestionada
 * (nunca incluye comunidades donde solo se es miembro).
 */
export function AdminOverviewCard() {
  const overview = useAdminOverview(true);

  if (overview.isLoading) {
    return (
      <Card title="Panel de administración">
        <Spinner />
      </Card>
    );
  }
  if (overview.error) {
    return (
      <Card title="Panel de administración">
        <ErrorAlert message={overview.error.message} />
      </Card>
    );
  }
  if (!overview.data || overview.data.length === 0) {
    return null;
  }

  return (
    <Card title="Panel de administración">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-accent-soft text-left text-neutral-500">
              <th className="py-2">Comunidad</th>
              <th className="py-2">Rol</th>
              <th className="py-2 text-right">Miembros</th>
              <th className="py-2 text-right">Incidencias</th>
              <th className="py-2 text-right">Tareas</th>
              <th className="py-2 text-right">Invitaciones</th>
              <th className="py-2 text-right">Renuevan pronto</th>
              <th className="py-2 text-right">Pendiente de pago</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {overview.data.map((community) => (
              <tr key={community.id} className="border-b border-accent-soft/60">
                <td className="py-2 font-medium text-primary">{community.name}</td>
                <td className="py-2">
                  <RoleBadge role={community.role} />
                </td>
                <td className="py-2 text-right">{community.metrics.members}</td>
                <td className="py-2 text-right">{community.metrics.openIncidents}</td>
                <td className="py-2 text-right">{community.metrics.openTasks}</td>
                <td className="py-2 text-right">
                  {community.metrics.pendingInvitations}
                </td>
                <td className="py-2 text-right">
                  {community.metrics.contractsRenewingSoon}
                </td>
                <td className="py-2 text-right">
                  {formatEuro(community.metrics.unpaidExpenses)}
                </td>
                <td className="py-2 text-right">
                  <Link to={`/communities/${community.id}`}>
                    <Button variant="secondary">Gestionar</Button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-neutral-500">
        Renovaciones próximas: contratos que vencen en los próximos 30 días.
      </p>
    </Card>
  );
}
