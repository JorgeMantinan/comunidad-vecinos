import { Card, ErrorAlert } from '../../components/ui';
import { useAuditEvents } from '../../lib/api';
import { auditActionLabel } from './actions';

/**
 * Historial de acciones críticas: **solo `owner` y `admin`** (junta y
 * administración de fincas); los propietarios y residentes no lo ven ni
 * en la interfaz ni en la API (403).
 */
export function AuditCard({
  communityId,
  role,
}: {
  communityId: string;
  role: string;
}) {
  const events = useAuditEvents(
    role === 'owner' || role === 'admin' ? communityId : undefined,
  );

  if (role !== 'owner' && role !== 'admin') {
    return null;
  }

  return (
    <Card title="Actividad reciente">
      {events.error ? <ErrorAlert message={events.error.message} /> : null}
      <ul className="divide-y divide-accent-soft text-sm">
        {events.data?.map((event) => (
          <li key={event.id} className="flex justify-between gap-3 py-2">
            <span className="font-medium text-body" title={event.action}>
              {auditActionLabel(event.action)}
            </span>
            <span className="shrink-0 text-subtle">
              {new Date(event.createdAt).toLocaleString('es-ES')}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
