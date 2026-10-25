import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import type { CommunityRole, MeetingStatus } from '@comunidad/shared';
import { createMeetingInputSchema } from '@comunidad/shared';
import { Button, Card, ErrorAlert, Field, Input, Spinner } from '../../components/ui';
import { useCreateMeeting, useMeetings } from './api';

const formSchema = z.object({
  title: createMeetingInputSchema.shape.title,
  scheduledFor: z.string().min(1, 'Indica fecha y hora'),
  location: z.string().trim().max(200).optional(),
});
type FormValues = z.infer<typeof formSchema>;

const statusLabels: Record<MeetingStatus, string> = {
  planned: 'Convocada',
  finished: 'Finalizada',
  cancelled: 'Cancelada',
};

export const meetingStatusBadge: Record<MeetingStatus, string> = {
  planned: 'bg-accent-soft text-primary',
  finished: 'bg-success text-on-success',
  cancelled: 'bg-chip text-muted',
};

export function MeetingsCard({
  communityId,
  role,
}: {
  communityId: string;
  role: CommunityRole;
}) {
  const meetings = useMeetings(communityId);
  const create = useCreateMeeting(communityId);
  const manage = role === 'owner' || role === 'admin';

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: '', scheduledFor: '', location: '' },
  });

  const onSubmit = form.handleSubmit((values) => {
    create.mutate(
      {
        title: values.title,
        scheduledFor: new Date(values.scheduledFor).toISOString(),
        location: values.location || undefined,
      },
      { onSuccess: () => form.reset() },
    );
  });

  return (
    <Card title="Reuniones">
      {meetings.error ? <ErrorAlert message={meetings.error.message} /> : null}
      {create.error ? <ErrorAlert message={create.error.message} /> : null}

      {meetings.isLoading ? <Spinner /> : null}
      {meetings.data && meetings.data.length === 0 ? (
        <p className="text-sm text-muted">No hay reuniones convocadas.</p>
      ) : null}

      <ul className="divide-y divide-accent-soft">
        {meetings.data?.map((meeting) => (
          <li key={meeting.id} className="py-3">
            <Link
              to={`/communities/${communityId}/meetings/${meeting.id}`}
              className="flex items-center justify-between gap-3 hover:bg-accent-soft/40"
            >
              <div>
                <p className="font-medium text-primary">{meeting.title}</p>
                <p className="text-sm text-muted">
                  {new Date(meeting.scheduledFor).toLocaleString('es-ES', {
                    dateStyle: 'long',
                    timeStyle: 'short',
                  })}
                  {meeting.location ? ` · ${meeting.location}` : ''}
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${meetingStatusBadge[meeting.status]}`}
              >
                {statusLabels[meeting.status]}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {manage ? (
        <form onSubmit={onSubmit} noValidate className="mt-4 border-t pt-4">
          <h3 className="mb-2 text-sm font-semibold text-primary">Convocar reunión</h3>
          <Field
            label="Título"
            htmlFor="meeting-title"
            error={form.formState.errors.title?.message}
          >
            <Input id="meeting-title" {...form.register('title')} />
          </Field>
          <Field
            label="Fecha y hora"
            htmlFor="meeting-date"
            error={form.formState.errors.scheduledFor?.message}
          >
            <Input
              id="meeting-date"
              type="datetime-local"
              {...form.register('scheduledFor')}
            />
          </Field>
          <Field
            label="Lugar (opcional)"
            htmlFor="meeting-location"
            error={form.formState.errors.location?.message}
          >
            <Input
              id="meeting-location"
              placeholder="Salón de actos"
              {...form.register('location')}
            />
          </Field>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? 'Convocando…' : 'Convocar'}
          </Button>
        </form>
      ) : null}
    </Card>
  );
}
