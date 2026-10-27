import { Link, useNavigate } from 'react-router-dom';
import { ArrowRightIcon } from '../../components/icons';
import { Card, ErrorAlert, RoleBadge, Spinner } from '../../components/ui';
import { formatEuro } from '../expenses/api';
import { useAdminOverview } from './api';

/**
 * Panel de administración de fincas: una fila por comunidad gestionada
 * (nunca incluye comunidades donde solo es miembro).
 *
 * **La fila entera es clicable**: en móvil hay que deslizar la tabla
 * para llegar al final y el botón «Gestionar» quedaba pegado al importe.
 * El enlace del nombre mantiene el acceso por teclado y lector de
 * pantalla; la flecha es solo indicio visual.
 */
export function AdminOverviewCard() {
  const overview = useAdminOverview(true);
  const navigate = useNavigate();

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
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-accent-soft text-left text-subtle">
              <th className="px-2 py-2">Comunidad</th>
              <th className="px-2 py-2">Rol</th>
              <th className="px-2 py-2 text-right">Miembros</th>
              <th className="px-2 py-2 text-right">Incidencias</th>
              <th className="px-2 py-2 text-right">Tareas</th>
              <th className="px-2 py-2 text-right">Invitaciones</th>
              <th className="px-2 py-2 text-right">Renuevan pronto</th>
              <th className="px-2 py-2 text-right">Pendiente de pago</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {overview.data.map((community) => {
              const to = `/communities/${community.id}`;
              return (
                <tr
                  key={community.id}
                  className="cursor-pointer border-b border-accent-soft/60 transition-colors hover:bg-accent-soft/40"
                  onClick={() => navigate(to)}
                >
                  <td className="px-2 py-2 font-medium text-primary">
                    <Link
                      to={to}
                      className="rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                    >
                      {community.name}
                    </Link>
                  </td>
                  <td className="px-2 py-2">
                    <RoleBadge role={community.role} />
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-right">
                    {community.metrics.members}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-right">
                    {community.metrics.openIncidents}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-right">
                    {community.metrics.openTasks}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-right">
                    {community.metrics.pendingInvitations}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-right">
                    {community.metrics.contractsRenewingSoon}
                  </td>
                  <td className="whitespace-nowrap py-2 pl-6 pr-3 text-right">
                    {formatEuro(community.metrics.unpaidExpenses)}
                  </td>
                  <td className="w-8 px-2 py-2 text-right">
                    <span
                      aria-hidden="true"
                      title={`Gestionar ${community.name}`}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft text-primary"
                    >
                      <ArrowRightIcon className="h-4 w-4" />
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-subtle">
        «Renuevan pronto»: contratos de servicio (ascensor, limpieza, jardinería…) que
        vencen en los próximos 30 días. Conviene revisarlos a tiempo para prorrogarlos o
        pedir otras ofertas. Toca cualquier fila para entrar en la comunidad.
      </p>
    </Card>
  );
}
