import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { createCommunityInputSchema } from '@comunidad/shared';
import { z } from 'zod';
import {
  Button,
  Card,
  ErrorAlert,
  Field,
  Input,
  RoleBadge,
  Spinner,
} from '../components/ui';
import { AdminOverviewCard } from '../features/admin/admin-overview-card';
import { useAnnouncements } from '../features/announcements/api';
import { formatEuro, useExpenses } from '../features/expenses/api';
import { useMeetings } from '../features/meetings/api';
import { useCommunities, useCreateCommunity, usePendingInvitations } from '../lib/api';

const createSchema = createCommunityInputSchema.extend({
  address: z.string().trim().max(300).optional(),
});
type CreateValues = z.infer<typeof createSchema>;

export function DashboardPage() {
  const communities = useCommunities();

  return (
    <div className="grid gap-6 md:grid-cols-3">
      <div className="md:col-span-2">
        <Card title="Mis comunidades">
          {communities.isLoading ? <Spinner /> : null}
          {communities.error ? (
            <ErrorAlert message={communities.error.message} />
          ) : null}
          {communities.data && communities.data.length === 0 ? (
            <p className="text-sm text-neutral-600">
              Todavía no perteneces a ninguna comunidad. Crea una nueva o espera a que
              te inviten.
            </p>
          ) : null}
          <ul className="divide-y divide-accent-soft">
            {communities.data?.map((community) => (
              <li key={community.id}>
                <Link
                  to={`/communities/${community.id}`}
                  className="flex items-center justify-between py-3 hover:bg-accent-soft/40"
                >
                  <div>
                    <p className="font-medium text-primary">{community.name}</p>
                    <p className="text-sm text-neutral-600">
                      {community.address ?? 'Sin dirección registrada'}
                    </p>
                  </div>
                  <RoleBadge role={community.role} />
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <PendingInvitations />
      </div>

      <CreateCommunityCard />

      <div className="md:col-span-3">
        <AdminOverviewCard />
        <div className="mt-6">
          <CommunityOverview />
        </div>
      </div>
    </div>
  );
}

/** Resumen de la comunidad seleccionada: avisos, reuniones y gastos. */
function CommunityOverview() {
  const communities = useCommunities();
  const list = communities.data ?? [];
  const [selectedId, setSelectedId] = useState('');
  const activeId = selectedId || list[0]?.id;
  const active = list.find((community) => community.id === activeId);
  const canSeeEconomy = active !== undefined && active.role !== 'resident';

  const announcements = useAnnouncements(activeId);
  const meetings = useMeetings(activeId);
  const expenses = useExpenses(canSeeEconomy ? activeId : undefined, 5);

  if (list.length === 0) {
    return null;
  }

  return (
    <div className="mt-6">
      <Card title={`Resumen de ${active?.name ?? 'la comunidad'}`}>
        {list.length > 1 ? (
          <Field label="Comunidad" htmlFor="overview-community">
            <select
              id="overview-community"
              value={activeId ?? ''}
              onChange={(event) => setSelectedId(event.target.value)}
              className="w-full max-w-sm rounded-lg border border-accent bg-white px-3 py-2 text-sm"
            >
              {list.map((community) => (
                <option key={community.id} value={community.id}>
                  {community.name}
                </option>
              ))}
            </select>
          </Field>
        ) : null}

        <div className="grid gap-6 md:grid-cols-3">
          <section>
            <h3 className="mb-2 text-sm font-semibold text-primary">
              Avisos recientes
            </h3>
            {announcements.isLoading ? <Spinner /> : null}
            <ul className="space-y-2 text-sm">
              {announcements.data?.slice(0, 3).map((announcement) => (
                <li key={announcement.id}>
                  <p className="font-medium text-neutral-800">{announcement.title}</p>
                  <p className="text-xs text-neutral-500">
                    {new Date(announcement.publishedAt).toLocaleDateString('es-ES')}
                  </p>
                </li>
              ))}
            </ul>
            {announcements.data?.length === 0 ? (
              <p className="text-sm text-neutral-600">Sin avisos.</p>
            ) : null}
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold text-primary">
              Próximas reuniones
            </h3>
            {meetings.isLoading ? <Spinner /> : null}
            <ul className="space-y-2 text-sm">
              {meetings.data?.slice(0, 3).map((meeting) => (
                <li key={meeting.id}>
                  <Link
                    to={`/communities/${activeId}/meetings/${meeting.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {meeting.title}
                  </Link>
                  <p className="text-xs text-neutral-500">
                    {new Date(meeting.scheduledFor).toLocaleString('es-ES', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </p>
                </li>
              ))}
            </ul>
            {meetings.data?.length === 0 ? (
              <p className="text-sm text-neutral-600">Sin reuniones.</p>
            ) : null}
          </section>

          {canSeeEconomy ? (
            <section>
              <h3 className="mb-2 text-sm font-semibold text-primary">
                Últimos gastos
              </h3>
              {expenses.isLoading ? <Spinner /> : null}
              <ul className="space-y-2 text-sm">
                {expenses.data?.map((expense) => (
                  <li key={expense.id} className="flex justify-between gap-2">
                    <span className="text-neutral-700">{expense.concept}</span>
                    <span className="font-medium text-primary">
                      {formatEuro(expense.amount)}
                    </span>
                  </li>
                ))}
              </ul>
              {expenses.data?.length === 0 ? (
                <p className="text-sm text-neutral-600">Sin gastos.</p>
              ) : null}
            </section>
          ) : null}
        </div>
      </Card>
    </div>
  );
}

function CreateCommunityCard() {
  const navigate = useNavigate();
  const createCommunity = useCreateCommunity();
  const form = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: '', address: '' },
  });

  const onSubmit = form.handleSubmit((values) => {
    createCommunity.mutate(values, {
      onSuccess: (community) => navigate(`/communities/${community.id}`),
    });
  });

  return (
    <Card title="Crear comunidad">
      {createCommunity.error ? (
        <ErrorAlert message={createCommunity.error.message} />
      ) : null}
      <form onSubmit={onSubmit} noValidate>
        <Field
          label="Nombre"
          htmlFor="community-name"
          error={form.formState.errors.name?.message}
        >
          <Input
            id="community-name"
            placeholder="Comunidad Calle Mayor 12"
            {...form.register('name')}
          />
        </Field>
        <Field
          label="Dirección"
          htmlFor="community-address"
          error={form.formState.errors.address?.message}
        >
          <Input
            id="community-address"
            placeholder="Calle Mayor 12, Madrid"
            {...form.register('address')}
          />
        </Field>
        <Button type="submit" disabled={createCommunity.isPending}>
          {createCommunity.isPending ? 'Creando…' : 'Crear comunidad'}
        </Button>
      </form>
    </Card>
  );
}

function PendingInvitations() {
  const pending = usePendingInvitations();

  if (!pending.data || pending.data.length === 0) {
    return null;
  }

  return (
    <div className="mt-6">
      <Card title="Invitaciones pendientes">
        <ul className="divide-y divide-accent-soft">
          {pending.data.map((invitation) => (
            <li key={invitation.id} className="py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-neutral-800">
                    {invitation.communityName}
                  </p>
                  <p className="text-sm text-neutral-600">
                    Invitado por {invitation.invitedByName} como{' '}
                    <RoleBadge role={invitation.role} />
                  </p>
                </div>
                <RoleBadge role={invitation.role} />
              </div>
              <p className="mt-1 text-sm text-neutral-500">
                Para unirte, abre el enlace de invitación que te compartió{' '}
                {invitation.invitedByName} (caduca el{' '}
                {new Date(invitation.expiresAt).toLocaleDateString('es-ES')}).
              </p>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
