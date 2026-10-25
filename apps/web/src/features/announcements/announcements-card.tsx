import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { CommunityRole } from '@comunidad/shared';
import { createAnnouncementInputSchema } from '@comunidad/shared';
import { Button, Card, ErrorAlert, Field, Input, Spinner } from '../../components/ui';
import { useAnnouncements, useDeleteAnnouncement, usePublishAnnouncement } from './api';

const formSchema = createAnnouncementInputSchema.extend({
  expiresAt: z.string().optional(),
});
type FormValues = z.infer<typeof formSchema>;

const canManage = (role: CommunityRole): boolean =>
  role === 'owner' || role === 'admin';

export function AnnouncementsCard({
  communityId,
  role,
}: {
  communityId: string;
  role: CommunityRole;
}) {
  const announcements = useAnnouncements(communityId);
  const publish = usePublishAnnouncement(communityId);
  const remove = useDeleteAnnouncement(communityId);
  const manage = canManage(role);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: '', body: '', expiresAt: '' },
  });

  const onSubmit = form.handleSubmit((values) => {
    publish.mutate(
      {
        title: values.title,
        body: values.body,
        expiresAt: values.expiresAt ? new Date(values.expiresAt).toISOString() : null,
      },
      {
        onSuccess: () => form.reset(),
      },
    );
  });

  return (
    <Card title="Avisos">
      {announcements.error ? (
        <ErrorAlert message={announcements.error.message} />
      ) : null}
      {publish.error ? <ErrorAlert message={publish.error.message} /> : null}
      {remove.error ? <ErrorAlert message={remove.error.message} /> : null}

      {announcements.isLoading ? <Spinner /> : null}
      {announcements.data && announcements.data.length === 0 ? (
        <p className="text-sm text-muted">No hay avisos publicados.</p>
      ) : null}

      <ul className="divide-y divide-accent-soft">
        {announcements.data?.map((announcement) => (
          <li key={announcement.id} className="py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-body">{announcement.title}</p>
                <p className="whitespace-pre-line text-sm text-muted">
                  {announcement.body}
                </p>
                <p className="mt-1 text-xs text-subtle">
                  {new Date(announcement.publishedAt).toLocaleString('es-ES')}
                  {announcement.authorName ? ` · ${announcement.authorName}` : ''}
                </p>
              </div>
              {manage ? (
                <Button
                  variant="danger"
                  onClick={() => remove.mutate(announcement.id)}
                  disabled={remove.isPending}
                >
                  Eliminar
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      {manage ? (
        <form onSubmit={onSubmit} noValidate className="mt-4 border-t pt-4">
          <h3 className="mb-2 text-sm font-semibold text-primary">Nuevo aviso</h3>
          <Field
            label="Título"
            htmlFor="announcement-title"
            error={form.formState.errors.title?.message}
          >
            <Input id="announcement-title" {...form.register('title')} />
          </Field>
          <Field
            label="Contenido"
            htmlFor="announcement-body"
            error={form.formState.errors.body?.message}
          >
            <textarea
              id="announcement-body"
              rows={3}
              className="w-full rounded-lg border border-accent bg-card px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-accent-soft"
              {...form.register('body')}
            />
          </Field>
          <Field
            label="Caduca (opcional)"
            htmlFor="announcement-expires"
            error={form.formState.errors.expiresAt?.message}
          >
            <Input
              id="announcement-expires"
              type="datetime-local"
              {...form.register('expiresAt')}
            />
          </Field>
          <Button type="submit" disabled={publish.isPending}>
            {publish.isPending ? 'Publicando…' : 'Publicar'}
          </Button>
        </form>
      ) : null}
    </Card>
  );
}
