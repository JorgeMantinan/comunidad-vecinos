import { zodResolver } from '@hookform/resolvers/zod';
import { useRef } from 'react';
import { useForm } from 'react-hook-form';
import type { CommunityRole, IncidentStatus } from '@comunidad/shared';
import { createIncidentInputSchema, MAX_FILE_BYTES } from '@comunidad/shared';
import { Button, Card, ErrorAlert, Field, Input, Spinner } from '../../components/ui';
import { fileToBase64 } from '../../lib/file';
import {
  useDeleteIncident,
  useDownloadIncidentPhoto,
  useIncidents,
  useReportIncident,
  useUpdateIncident,
  useUploadIncidentPhoto,
} from './api';

const statusLabels: Record<IncidentStatus, string> = {
  open: 'Abierta',
  in_progress: 'En curso',
  resolved: 'Resuelta',
};

const statusBadge: Record<IncidentStatus, string> = {
  open: 'bg-red-100 text-red-800',
  in_progress: 'bg-amber-100 text-amber-800',
  resolved: 'bg-green-100 text-green-800',
};

export function IncidentsCard({
  communityId,
  role,
}: {
  communityId: string;
  role: CommunityRole;
}) {
  const incidents = useIncidents(communityId);
  const report = useReportIncident(communityId);
  const update = useUpdateIncident(communityId);
  const remove = useDeleteIncident(communityId);
  const uploadPhoto = useUploadIncidentPhoto(communityId);
  const downloadPhoto = useDownloadIncidentPhoto(communityId);
  const manage = role === 'owner' || role === 'admin';
  const photoInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const form = useForm({
    resolver: zodResolver(createIncidentInputSchema),
    defaultValues: { title: '', description: '' },
  });

  const onSubmit = form.handleSubmit((values) => {
    report.mutate(values, { onSuccess: () => form.reset() });
  });

  return (
    <Card title="Incidencias">
      {incidents.error ? <ErrorAlert message={incidents.error.message} /> : null}
      {report.error ? <ErrorAlert message={report.error.message} /> : null}
      {update.error ? <ErrorAlert message={update.error.message} /> : null}
      {remove.error ? <ErrorAlert message={remove.error.message} /> : null}
      {uploadPhoto.error ? <ErrorAlert message={uploadPhoto.error.message} /> : null}
      {downloadPhoto.error ? (
        <ErrorAlert message={downloadPhoto.error.message} />
      ) : null}

      {incidents.isLoading ? <Spinner /> : null}
      {!incidents.isLoading && (incidents.data?.length ?? 0) === 0 ? (
        <p className="text-sm text-neutral-600">Sin incidencias registradas.</p>
      ) : null}

      <ul className="divide-y divide-accent-soft">
        {incidents.data?.map((incident) => (
          <li key={incident.id} className="py-3 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium text-neutral-800">{incident.title}</p>
                <p className="whitespace-pre-line text-neutral-600">
                  {incident.description}
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  {incident.reportedByName
                    ? `Reportada por ${incident.reportedByName} · `
                    : ''}
                  {new Date(incident.createdAt).toLocaleString('es-ES')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge[incident.status]}`}
                >
                  {statusLabels[incident.status]}
                </span>
                {manage ? (
                  <select
                    value={incident.status}
                    aria-label={`Estado de ${incident.title}`}
                    onChange={(event) =>
                      update.mutate({
                        incidentId: incident.id,
                        changes: {
                          status: event.target.value as IncidentStatus,
                        },
                      })
                    }
                    className="rounded-lg border border-accent bg-white px-2 py-1 text-xs"
                  >
                    {(
                      Object.entries(statusLabels) as Array<[IncidentStatus, string]>
                    ).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                ) : null}
                {manage ? (
                  <Button
                    variant="danger"
                    onClick={() => remove.mutate(incident.id)}
                    disabled={remove.isPending}
                  >
                    Borrar
                  </Button>
                ) : null}
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {incident.photos.map((photo) => (
                <button
                  key={photo.id}
                  type="button"
                  onClick={() =>
                    downloadPhoto.mutate({
                      incidentId: incident.id,
                      photoId: photo.id,
                    })
                  }
                  className="rounded bg-accent-soft px-2 py-1 text-xs text-primary hover:bg-accent"
                  title="Abrir fotografía con enlace temporal"
                >
                  📷 {new Date(photo.createdAt).toLocaleDateString('es-ES')}
                </button>
              ))}
              <label className="cursor-pointer rounded border border-dashed border-accent px-2 py-1 text-xs text-neutral-500 hover:bg-accent-soft/50">
                + adjuntar foto
                <input
                  ref={(element) => {
                    photoInputRefs.current[incident.id] = element;
                  }}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    event.target.value = '';
                    if (!file || file.size > MAX_FILE_BYTES) {
                      return;
                    }
                    uploadPhoto.mutate({
                      incidentId: incident.id,
                      contentType: file.type,
                      contentBase64: await fileToBase64(file),
                    });
                  }}
                />
              </label>
            </div>
          </li>
        ))}
      </ul>

      <form onSubmit={onSubmit} noValidate className="mt-4 border-t pt-4">
        <h3 className="mb-2 text-sm font-semibold text-primary">Reportar incidencia</h3>
        <Field
          label="Título"
          htmlFor="incident-title"
          error={form.formState.errors.title?.message}
        >
          <Input id="incident-title" {...form.register('title')} />
        </Field>
        <Field
          label="Descripción"
          htmlFor="incident-description"
          error={form.formState.errors.description?.message}
        >
          <textarea
            id="incident-description"
            rows={3}
            className="w-full rounded-lg border border-accent bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-accent-soft"
            {...form.register('description')}
          />
        </Field>
        <Button type="submit" disabled={report.isPending}>
          {report.isPending ? 'Enviando…' : 'Reportar'}
        </Button>
      </form>
    </Card>
  );
}
