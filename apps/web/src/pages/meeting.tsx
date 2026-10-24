import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useParams } from 'react-router-dom';
import { type z } from 'zod';
import type { AgreementStatus, MeetingStatus } from '@comunidad/shared';
import {
  createAgendaItemInputSchema,
  createAgreementInputSchema,
} from '@comunidad/shared';
import { Button, Card, ErrorAlert, Field, Input, Spinner } from '../components/ui';
import {
  useAddAgendaItem,
  useAddAgreement,
  useDeleteAgendaItem,
  useMeetingDetail,
  useSetAgreementStatus,
  useUpdateMeeting,
} from '../features/meetings/api';
import { meetingStatusBadge } from '../features/meetings/meetings-card';
import { useCommunity } from '../lib/api';
import { useSession } from '../lib/auth';

const statusLabels: Record<MeetingStatus, string> = {
  planned: 'Convocada',
  finished: 'Finalizada',
  cancelled: 'Cancelada',
};

const agreementLabels: Record<AgreementStatus, string> = {
  proposed: 'Propuesto',
  approved: 'Aprobado',
  rejected: 'Rechazado',
};

export function MeetingPage() {
  const { id, meetingId } = useParams<{ id: string; meetingId: string }>();
  const community = useCommunity(id);
  const detail = useMeetingDetail(id, meetingId);
  const { data: session } = useSession();

  const role = community.data?.role;
  const manage = role === 'owner' || role === 'admin';

  if (community.isLoading || detail.isLoading) {
    return (
      <div className="flex justify-center">
        <Spinner />
      </div>
    );
  }
  if (detail.error || !detail.data) {
    return <ErrorAlert message={detail.error?.message ?? 'Reunión no encontrada'} />;
  }

  const meeting = detail.data;

  return (
    <div className="space-y-6">
      <header>
        <Link to={`/communities/${id}`} className="text-sm text-primary">
          ← Volver a la comunidad
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold text-primary">{meeting.title}</h1>
            <p className="text-neutral-600">
              {new Date(meeting.scheduledFor).toLocaleString('es-ES', {
                dateStyle: 'full',
                timeStyle: 'short',
              })}
              {meeting.location ? ` · ${meeting.location}` : ''}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-sm font-medium ${meetingStatusBadge[meeting.status]}`}
          >
            {statusLabels[meeting.status]}
          </span>
        </div>
      </header>

      <AgendaSection
        meeting={meeting}
        manage={manage}
        communityId={id ?? ''}
        meetingId={meetingId ?? ''}
      />

      <MinutesSection
        meeting={meeting}
        manage={manage}
        communityId={id ?? ''}
        meetingId={meetingId ?? ''}
      />

      <AgreementsSection
        meeting={meeting}
        manage={manage}
        communityId={id ?? ''}
        meetingId={meetingId ?? ''}
      />

      {!manage && session ? (
        <p className="text-sm text-neutral-500">
          Tu rol en esta comunidad no permite gestionar la reunión.
        </p>
      ) : null}
    </div>
  );
}

function AgendaSection({
  meeting,
  manage,
  communityId,
  meetingId,
}: {
  meeting: {
    agenda: Array<{
      id: string;
      position: number;
      title: string;
      description: string | null;
    }>;
  };
  manage: boolean;
  communityId: string;
  meetingId: string;
}) {
  const add = useAddAgendaItem(communityId, meetingId);
  const remove = useDeleteAgendaItem(communityId, meetingId);
  const form = useForm<z.infer<typeof createAgendaItemInputSchema>>({
    resolver: zodResolver(createAgendaItemInputSchema),
    defaultValues: { title: '', description: '' },
  });

  return (
    <Card title="Orden del día">
      {add.error ? <ErrorAlert message={add.error.message} /> : null}
      {remove.error ? <ErrorAlert message={remove.error.message} /> : null}

      {meeting.agenda.length === 0 ? (
        <p className="text-sm text-neutral-600">Todavía no hay puntos propuestos.</p>
      ) : (
        <ol className="space-y-3">
          {meeting.agenda.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-neutral-800">
                  {item.position}. {item.title}
                </p>
                {item.description ? (
                  <p className="text-sm text-neutral-600">{item.description}</p>
                ) : null}
              </div>
              {manage ? (
                <Button
                  variant="danger"
                  onClick={() => remove.mutate(item.id)}
                  disabled={remove.isPending}
                >
                  Quitar
                </Button>
              ) : null}
            </li>
          ))}
        </ol>
      )}

      {manage ? (
        <form
          onSubmit={form.handleSubmit((values) =>
            add.mutate(values, { onSuccess: () => form.reset() }),
          )}
          noValidate
          className="mt-4 border-t pt-4"
        >
          <Field
            label="Nuevo punto"
            htmlFor="agenda-title"
            error={form.formState.errors.title?.message}
          >
            <Input id="agenda-title" {...form.register('title')} />
          </Field>
          <Field
            label="Descripción (opcional)"
            htmlFor="agenda-description"
            error={form.formState.errors.description?.message}
          >
            <Input id="agenda-description" {...form.register('description')} />
          </Field>
          <Button type="submit" disabled={add.isPending}>
            Añadir punto
          </Button>
        </form>
      ) : null}
    </Card>
  );
}

function MinutesSection({
  meeting,
  manage,
  communityId,
  meetingId,
}: {
  meeting: { minutes: string | null; status: MeetingStatus };
  manage: boolean;
  communityId: string;
  meetingId: string;
}) {
  const update = useUpdateMeeting(communityId);
  const [draft, setDraft] = useState(meeting.minutes ?? '');

  // Sincroniza el borrador cuando cambia el acta guardada.
  useEffect(() => {
    setDraft(meeting.minutes ?? '');
  }, [meeting.minutes]);

  if (!manage) {
    return (
      <Card title="Acta">
        {meeting.minutes ? (
          <p className="whitespace-pre-line text-sm text-neutral-700">
            {meeting.minutes}
          </p>
        ) : (
          <p className="text-sm text-neutral-600">
            El acta todavía no está disponible.
          </p>
        )}
      </Card>
    );
  }

  return (
    <Card title="Acta y estado">
      {update.error ? <ErrorAlert message={update.error.message} /> : null}
      <Field label="Acta de la reunión" htmlFor="meeting-minutes">
        <textarea
          id="meeting-minutes"
          rows={6}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          className="w-full rounded-lg border border-accent bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-accent-soft"
          placeholder="Acuerdos, intervenciones…"
        />
      </Field>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label
            htmlFor="meeting-status"
            className="mb-1 block text-sm font-medium text-neutral-700"
          >
            Estado
          </label>
          <select
            id="meeting-status"
            value={meeting.status}
            onChange={(event) =>
              update.mutate({
                meetingId,
                changes: {
                  status: event.target.value as MeetingStatus,
                },
              })
            }
            className="rounded-lg border border-accent bg-white px-3 py-2 text-sm"
          >
            {(Object.entries(statusLabels) as Array<[MeetingStatus, string]>).map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ),
            )}
          </select>
        </div>
        <Button
          onClick={() => update.mutate({ meetingId, changes: { minutes: draft } })}
          disabled={update.isPending}
        >
          {update.isPending ? 'Guardando…' : 'Guardar acta'}
        </Button>
      </div>
    </Card>
  );
}

function AgreementsSection({
  meeting,
  manage,
  communityId,
  meetingId,
}: {
  meeting: {
    agreements: Array<{
      id: string;
      title: string;
      body: string;
      status: AgreementStatus;
    }>;
  };
  manage: boolean;
  communityId: string;
  meetingId: string;
}) {
  const add = useAddAgreement(communityId, meetingId);
  const setStatus = useSetAgreementStatus(communityId, meetingId);
  const form = useForm<z.infer<typeof createAgreementInputSchema>>({
    resolver: zodResolver(createAgreementInputSchema),
    defaultValues: { title: '', body: '' },
  });

  return (
    <Card title="Acuerdos">
      {add.error ? <ErrorAlert message={add.error.message} /> : null}
      {setStatus.error ? <ErrorAlert message={setStatus.error.message} /> : null}

      {meeting.agreements.length === 0 ? (
        <p className="text-sm text-neutral-600">No hay acuerdos registrados.</p>
      ) : (
        <ul className="divide-y divide-accent-soft">
          {meeting.agreements.map((agreement) => (
            <li key={agreement.id} className="py-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-neutral-800">{agreement.title}</p>
                  <p className="text-sm text-neutral-600">{agreement.body}</p>
                </div>
                <span
                  className={
                    agreement.status === 'approved'
                      ? 'rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800'
                      : agreement.status === 'rejected'
                        ? 'rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800'
                        : 'rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-primary'
                  }
                >
                  {agreementLabels[agreement.status]}
                </span>
              </div>
              {manage ? (
                <div className="mt-2 flex gap-2">
                  {agreement.status !== 'approved' ? (
                    <Button
                      onClick={() =>
                        setStatus.mutate({
                          agreementId: agreement.id,
                          status: 'approved',
                        })
                      }
                      disabled={setStatus.isPending}
                    >
                      Aprobar
                    </Button>
                  ) : null}
                  {agreement.status !== 'rejected' ? (
                    <Button
                      variant="danger"
                      onClick={() =>
                        setStatus.mutate({
                          agreementId: agreement.id,
                          status: 'rejected',
                        })
                      }
                      disabled={setStatus.isPending}
                    >
                      Rechazar
                    </Button>
                  ) : null}
                  {agreement.status !== 'proposed' ? (
                    <Button
                      variant="ghost"
                      onClick={() =>
                        setStatus.mutate({
                          agreementId: agreement.id,
                          status: 'proposed',
                        })
                      }
                      disabled={setStatus.isPending}
                    >
                      Volver a propuesto
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {manage ? (
        <form
          onSubmit={form.handleSubmit((values) =>
            add.mutate(values, { onSuccess: () => form.reset() }),
          )}
          noValidate
          className="mt-4 border-t pt-4"
        >
          <h3 className="mb-2 text-sm font-semibold text-primary">Nuevo acuerdo</h3>
          <Field
            label="Título"
            htmlFor="agreement-title"
            error={form.formState.errors.title?.message}
          >
            <Input id="agreement-title" {...form.register('title')} />
          </Field>
          <Field
            label="Contenido"
            htmlFor="agreement-body"
            error={form.formState.errors.body?.message}
          >
            <textarea
              id="agreement-body"
              rows={3}
              className="w-full rounded-lg border border-accent bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-accent-soft"
              {...form.register('body')}
            />
          </Field>
          <Button type="submit" disabled={add.isPending}>
            Registrar acuerdo
          </Button>
        </form>
      ) : null}
    </Card>
  );
}
