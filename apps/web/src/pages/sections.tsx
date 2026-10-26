import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { CommunitySummary } from '@comunidad/shared';
import { Button, ErrorAlert, Spinner } from '../components/ui';
import { AnnouncementsCard } from '../features/announcements/announcements-card';
import { AssetsCard } from '../features/assets/assets-card';
import { AssessmentsCard } from '../features/assessments/assessments-card';
import { AuditCard } from '../features/audit/audit-card';
import { ContractsCard } from '../features/contracts/contracts-card';
import { DocumentsCard } from '../features/documents/documents-card';
import { ExpensesCard } from '../features/expenses/expenses-card';
import { FeesCard } from '../features/fees/fees-card';
import { IncidentsCard } from '../features/incidents/incidents-card';
import { InvoicesCard } from '../features/invoices/invoices-card';
import { InvitationsCard } from '../features/invitations/invitations-card';
import { MembersCard } from '../features/members/members-card';
import { MeetingsCard } from '../features/meetings/meetings-card';
import { PollsCard } from '../features/polls/polls-card';
import { EconomyReportCard } from '../features/reports/reports-card';
import { ProfessionalsCard } from '../features/professionals/professionals-card';
import { StatsCard } from '../features/stats/stats-card';
import { SuggestionsCard } from '../features/suggestions/suggestions-card';
import { TasksCard } from '../features/tasks/tasks-card';
import { TemplatesCard } from '../features/templates/templates-card';
import { UnitsCard } from '../features/units/units-card';
import { useCommunity } from '../lib/api';

/**
 * Pantalla de un apartado: cabecera grande con botón de vuelta al menú
 * y el contenido en una sola columna (una cosa cada pantalla, pensado
 * para lectura cómoda).
 */
function SectionPage({
  title,
  children,
}: {
  title: string;
  children: (community: CommunitySummary, communityId: string) => ReactNode;
}) {
  const { id } = useParams<{ id: string }>();
  const community = useCommunity(id);

  if (community.isLoading) {
    return (
      <div className="flex justify-center">
        <Spinner />
      </div>
    );
  }
  if (community.error || !community.data || !id) {
    return (
      <ErrorAlert message={community.error?.message ?? 'Comunidad no encontrada'} />
    );
  }

  return (
    <div className="space-y-5">
      <Link to={`/communities/${id}`}>
        <Button variant="secondary">← Volver al menú</Button>
      </Link>
      <header>
        <h1 className="text-2xl font-bold text-primary sm:text-3xl">{title}</h1>
        <p className="text-muted">{community.data.name}</p>
      </header>
      {children(community.data, id)}
    </div>
  );
}

export function AvisosSection() {
  return (
    <SectionPage title="📢 Avisos">
      {(community, id) => <AnnouncementsCard communityId={id} role={community.role} />}
    </SectionPage>
  );
}

export function ReunionesSection() {
  return (
    <SectionPage title="📅 Reuniones">
      {(community, id) => <MeetingsCard communityId={id} role={community.role} />}
    </SectionPage>
  );
}

export function IncidenciasSection() {
  return (
    <SectionPage title="🔧 Incidencias">
      {(community, id) => <IncidentsCard communityId={id} role={community.role} />}
    </SectionPage>
  );
}

export function MantenimientoSection() {
  return (
    <SectionPage title="🏗️ Mantenimiento">
      {(community, id) => (
        <div className="space-y-6">
          <AssetsCard communityId={id} role={community.role} />
          <ContractsCard communityId={id} role={community.role} />
        </div>
      )}
    </SectionPage>
  );
}

export function TareasSection() {
  return (
    <SectionPage title="✅ Tareas">
      {(community, id) => <TasksCard communityId={id} role={community.role} />}
    </SectionPage>
  );
}

export function EconomiaSection() {
  return (
    <SectionPage title="💶 El dinero de la comunidad">
      {(community, id) =>
        community.role === 'resident' ? (
          <p className="text-muted">
            Tu rol no permite consultar la economía de la comunidad.
          </p>
        ) : (
          <div className="space-y-6">
            <ExpensesCard communityId={id} role={community.role} />
            <InvoicesCard communityId={id} role={community.role} />
            <AssessmentsCard communityId={id} role={community.role} />
            <FeesCard communityId={id} role={community.role} />
            <UnitsCard communityId={id} role={community.role} />
            <EconomyReportCard communityId={id} role={community.role} />
            <AuditCard communityId={id} role={community.role} />
          </div>
        )
      }
    </SectionPage>
  );
}

export function DocumentosSection() {
  return (
    <SectionPage title="📄 Documentos">
      {(community, id) =>
        community.role === 'resident' ? (
          <p className="text-muted">
            Tu rol no permite consultar la documentación de la comunidad.
          </p>
        ) : (
          <div className="space-y-6">
            <DocumentsCard communityId={id} role={community.role} />
            <TemplatesCard communityId={id} role={community.role} />
          </div>
        )
      }
    </SectionPage>
  );
}

export function VecinosSection() {
  return (
    <SectionPage title="👥 Vecinos">
      {(community, id) => (
        <div className="space-y-6">
          <MembersCard communityId={id} />
          <InvitationsCard communityId={id} role={community.role} />
        </div>
      )}
    </SectionPage>
  );
}

export function ParticipacionSection() {
  return (
    <SectionPage title="💡 Ideas y encuestas">
      {(community, id) => (
        <div className="space-y-6">
          <SuggestionsCard communityId={id} role={community.role} />
          <PollsCard communityId={id} role={community.role} />
        </div>
      )}
    </SectionPage>
  );
}

export function ProfesionalesSection() {
  return (
    <SectionPage title="🧰 Profesionales recomendados">
      {(community, id) => <ProfessionalsCard communityId={id} role={community.role} />}
    </SectionPage>
  );
}

export function EstadisticasSection() {
  return (
    <SectionPage title="📊 La comunidad en números">
      {(_community, id) => <StatsCard communityId={id} />}
    </SectionPage>
  );
}
