import { Card, ErrorAlert } from '../../components/ui';
import { useAuditEvents } from '../../lib/api';

/** Historial de acciones críticas (solo owner/admin). */
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
          <li key={event.id} className="flex justify-between py-2">
            <span className="font-medium text-neutral-800">{event.action}</span>
            <span className="text-neutral-500">
              {new Date(event.createdAt).toLocaleString('es-ES')}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
