import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useParams } from 'react-router-dom';
import { canManageRole, createInvitationInputSchema } from '@comunidad/shared';
import type { Member } from '@comunidad/shared';
import { type z } from 'zod';
import {
  Button,
  Card,
  ErrorAlert,
  Field,
  Input,
  RoleBadge,
  Spinner,
} from '../components/ui';
import { AnnouncementsCard } from '../features/announcements/announcements-card';
import { AssetsCard } from '../features/assets/assets-card';
import { AssessmentsCard } from '../features/assessments/assessments-card';
import { ContractsCard } from '../features/contracts/contracts-card';
import { DocumentsCard } from '../features/documents/documents-card';
import { useExportCommunity } from '../features/export/api';
import { ExpensesCard } from '../features/expenses/expenses-card';
import { IncidentsCard } from '../features/incidents/incidents-card';
import { InvoicesCard } from '../features/invoices/invoices-card';
import { MeetingsCard } from '../features/meetings/meetings-card';
import { PollsCard } from '../features/polls/polls-card';
import { EconomyReportCard } from '../features/reports/reports-card';
import { ProfessionalsCard } from '../features/professionals/professionals-card';
import { SuggestionsCard } from '../features/suggestions/suggestions-card';
import { TasksCard } from '../features/tasks/tasks-card';
import { TemplatesCard } from '../features/templates/templates-card';
import { UnitsCard } from '../features/units/units-card';
import {
  useAuditEvents,
  useChangeMemberRole,
  useCommunity,
  useCreateInvitation,
  useInvitations,
  useMembers,
  useRemoveMember,
  useRevokeInvitation,
} from '../lib/api';
import { useSession } from '../lib/auth';

const inviteSchema = createInvitationInputSchema;
type InviteValues = z.infer<typeof inviteSchema>;

export function CommunityPage() {
  const { id } = useParams<{ id: string }>();
  const community = useCommunity(id);

  if (community.isLoading) {
    return (
      <div className="flex justify-center">
        <Spinner />
      </div>
    );
  }
  if (community.error || !community.data) {
    return (
      <ErrorAlert message={community.error?.message ?? 'Comunidad no encontrada'} />
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <Link to="/" className="text-sm text-primary">
          ← Volver a mis comunidades
        </Link>
        <div className="mt-2 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary">{community.data.name}</h1>
            <p className="text-neutral-600">
              {community.data.address ?? 'Sin dirección registrada'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ExportButton
              communityId={community.data.id}
              canExport={
                community.data.role === 'owner' || community.data.role === 'admin'
              }
            />
            <RoleBadge role={community.data.role} />
          </div>
        </div>
      </header>

      <AnnouncementsCard communityId={community.data.id} role={community.data.role} />
      <IncidentsCard communityId={community.data.id} role={community.data.role} />
      <TasksCard communityId={community.data.id} role={community.data.role} />
      <AssetsCard communityId={community.data.id} role={community.data.role} />
      <ContractsCard communityId={community.data.id} role={community.data.role} />
      <MeetingsCard communityId={community.data.id} role={community.data.role} />
      <UnitsCard communityId={community.data.id} role={community.data.role} />
      {community.data.role !== 'resident' ? (
        <>
          <ExpensesCard communityId={community.data.id} role={community.data.role} />
          <InvoicesCard communityId={community.data.id} role={community.data.role} />
          <AssessmentsCard communityId={community.data.id} role={community.data.role} />
          <EconomyReportCard
            communityId={community.data.id}
            role={community.data.role}
          />
          <DocumentsCard communityId={community.data.id} role={community.data.role} />
          <TemplatesCard communityId={community.data.id} role={community.data.role} />
        </>
      ) : null}
      <SuggestionsCard communityId={community.data.id} role={community.data.role} />
      <PollsCard communityId={community.data.id} role={community.data.role} />
      <ProfessionalsCard communityId={community.data.id} role={community.data.role} />

      <MembersCard communityId={community.data.id} />
      <InvitationsCard communityId={community.data.id} role={community.data.role} />
      <AuditCard communityId={community.data.id} role={community.data.role} />
    </div>
  );
}

/** Descarga JSON con todos los datos de la comunidad (owner/admin). */
function ExportButton({
  communityId,
  canExport,
}: {
  communityId: string;
  canExport: boolean;
}) {
  const exportCommunity = useExportCommunity(communityId);
  if (!canExport) {
    return null;
  }
  return (
    <>
      {exportCommunity.error ? (
        <ErrorAlert message={exportCommunity.error.message} />
      ) : null}
      <Button
        variant="secondary"
        onClick={() => exportCommunity.mutate()}
        disabled={exportCommunity.isPending}
        title="Descarga un JSON con los datos de la comunidad"
      >
        {exportCommunity.isPending ? 'Exportando…' : 'Exportar datos'}
      </Button>
    </>
  );
}

function MembersCard({ communityId }: { communityId: string }) {
  const { data: session } = useSession();
  const members = useMembers(communityId);
  const changeRole = useChangeMemberRole(communityId);
  const removeMember = useRemoveMember(communityId);
  const myRole = members.data?.find((m) => m.userId === session?.user.id)?.role;

  if (members.error) {
    return <ErrorAlert message={members.error.message} />;
  }

  return (
    <Card title="Miembros">
      {members.isLoading ? <Spinner /> : null}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-accent-soft text-left text-neutral-500">
            <th className="py-2">Nombre</th>
            <th className="py-2">Email</th>
            <th className="py-2">Rol</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {members.data?.map((member) => (
            <MemberRow
              key={member.id}
              member={member}
              canManage={
                myRole !== undefined &&
                canManageRole(myRole, member.role) &&
                member.userId !== session?.user.id
              }
              onChangeRole={(role) => changeRole.mutate({ memberId: member.id, role })}
              onRemove={() => removeMember.mutate(member.id)}
            />
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function MemberRow({
  member,
  canManage,
  onChangeRole,
  onRemove,
}: {
  member: Member;
  canManage: boolean;
  onChangeRole: (role: string) => void;
  onRemove: () => void;
}) {
  return (
    <tr className="border-b border-accent-soft/60">
      <td className="py-2 font-medium text-neutral-800">{member.name}</td>
      <td className="py-2 text-neutral-600">{member.email}</td>
      <td className="py-2">
        {canManage ? (
          <select
            value={member.role}
            onChange={(event) => onChangeRole(event.target.value)}
            className="rounded-lg border border-accent bg-white px-2 py-1 text-sm"
            aria-label={`Rol de ${member.name}`}
          >
            <option value="owner">Presidente</option>
            <option value="admin">Administración</option>
            <option value="member">Propietario</option>
            <option value="resident">Residente</option>
          </select>
        ) : (
          <RoleBadge role={member.role} />
        )}
      </td>
      <td className="py-2 text-right">
        {canManage ? (
          <Button variant="danger" onClick={onRemove}>
            Eliminar
          </Button>
        ) : null}
      </td>
    </tr>
  );
}

function InvitationsCard({ communityId, role }: { communityId: string; role: string }) {
  const canInvite = role === 'owner' || role === 'admin';
  const invitations = useInvitations(canInvite ? communityId : undefined);
  const createInvitation = useCreateInvitation(communityId);
  const revokeInvitation = useRevokeInvitation(communityId);
  const [lastLink, setLastLink] = useState<string | null>(null);

  const form = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: '', role: 'member' },
  });

  if (!canInvite) {
    return null;
  }

  const onSubmit = form.handleSubmit((values) => {
    createInvitation.mutate(values, {
      onSuccess: (data) => {
        setLastLink(`${window.location.origin}/invite/${data.token}`);
        form.reset();
      },
    });
  });

  return (
    <Card title="Invitaciones">
      {createInvitation.error ? (
        <ErrorAlert message={createInvitation.error.message} />
      ) : null}
      {revokeInvitation.error ? (
        <ErrorAlert message={revokeInvitation.error.message} />
      ) : null}

      <form onSubmit={onSubmit} noValidate className="flex flex-wrap gap-3">
        <div className="min-w-64 flex-1">
          <Field
            label="Email del invitado"
            htmlFor="invite-email"
            error={form.formState.errors.email?.message}
          >
            <Input id="invite-email" type="email" {...form.register('email')} />
          </Field>
        </div>
        <div className="w-44">
          <Field label="Rol inicial" htmlFor="invite-role">
            <select
              id="invite-role"
              className="w-full rounded-lg border border-accent bg-white px-3 py-2 text-sm"
              {...form.register('role')}
            >
              <option value="member">Propietario</option>
              <option value="resident">Residente</option>
              <option value="admin">Administración</option>
            </select>
          </Field>
        </div>
        <div className="flex items-end pb-4">
          <Button type="submit" disabled={createInvitation.isPending}>
            Invitar
          </Button>
        </div>
      </form>

      {lastLink ? (
        <div className="mb-4 rounded-lg bg-accent-soft p-3 text-sm">
          <p className="mb-1 font-medium text-primary">
            Enlace de invitación (se muestra una sola vez)
          </p>
          <input
            readOnly
            value={lastLink}
            className="w-full rounded border border-accent bg-white px-2 py-1 text-xs"
            onFocus={(event) => event.currentTarget.select()}
            aria-label="Enlace de invitación"
          />
          <p className="mt-1 text-neutral-600">
            Compártelo con el invitado. Por seguridad solo se guarda su hash.
          </p>
        </div>
      ) : null}

      <ul className="divide-y divide-accent-soft">
        {invitations.data?.map((invitation) => (
          <li
            key={invitation.id}
            className="flex items-center justify-between py-2 text-sm"
          >
            <div>
              <p className="font-medium text-neutral-800">{invitation.email}</p>
              <p className="text-neutral-500">
                Caduca el {new Date(invitation.expiresAt).toLocaleDateString('es-ES')}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs uppercase text-neutral-500">
                {invitation.status}
              </span>
              {invitation.status === 'pending' ? (
                <Button
                  variant="danger"
                  onClick={() => revokeInvitation.mutate(invitation.id)}
                  disabled={revokeInvitation.isPending}
                >
                  Revocar
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function AuditCard({ communityId, role }: { communityId: string; role: string }) {
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
