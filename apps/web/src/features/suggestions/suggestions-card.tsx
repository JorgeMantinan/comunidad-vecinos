import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import type { CommunityRole, SuggestionStatus } from '@comunidad/shared';
import { createSuggestionInputSchema } from '@comunidad/shared';
import { Button, Card, ErrorAlert, Field, Input, Spinner } from '../../components/ui';
import { useSession } from '../../lib/auth';
import {
  useCreateSuggestion,
  useDeleteSuggestion,
  useSetSuggestionStatus,
  useSuggestions,
} from './api';

const statusLabels: Record<SuggestionStatus, string> = {
  open: 'Nueva',
  under_review: 'En revisión',
  accepted: 'Aceptada',
  rejected: 'Descartada',
};

const statusBadge: Record<SuggestionStatus, string> = {
  open: 'bg-accent-soft text-primary',
  under_review: 'bg-warning text-on-warning',
  accepted: 'bg-success text-on-success',
  rejected: 'bg-chip text-muted',
};

export function SuggestionsCard({
  communityId,
  role,
}: {
  communityId: string;
  role: CommunityRole;
}) {
  const suggestions = useSuggestions(communityId);
  const create = useCreateSuggestion(communityId);
  const setStatus = useSetSuggestionStatus(communityId);
  const remove = useDeleteSuggestion(communityId);
  const { data: session } = useSession();
  const isAdmin = role === 'owner' || role === 'admin';

  const form = useForm({
    resolver: zodResolver(createSuggestionInputSchema),
    defaultValues: { title: '', body: '' },
  });

  const onSubmit = form.handleSubmit((values) => {
    create.mutate(values, { onSuccess: () => form.reset() });
  });

  return (
    <Card title="Sugerencias">
      {suggestions.error ? <ErrorAlert message={suggestions.error.message} /> : null}
      {create.error ? <ErrorAlert message={create.error.message} /> : null}
      {setStatus.error ? <ErrorAlert message={setStatus.error.message} /> : null}
      {remove.error ? <ErrorAlert message={remove.error.message} /> : null}

      {suggestions.isLoading ? <Spinner /> : null}
      {!suggestions.isLoading && (suggestions.data?.length ?? 0) === 0 ? (
        <p className="text-sm text-muted">No hay sugerencias. ¡Propón la primera!</p>
      ) : null}

      <ul className="divide-y divide-accent-soft">
        {suggestions.data?.map((suggestion) => {
          const canDelete = isAdmin || suggestion.authorId === session?.user.id;
          return (
            <li key={suggestion.id} className="py-3 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-body">{suggestion.title}</p>
                  <p className="whitespace-pre-line text-muted">{suggestion.body}</p>
                  <p className="mt-1 text-xs text-subtle">
                    {suggestion.authorName ? `De ${suggestion.authorName} · ` : ''}
                    {new Date(suggestion.createdAt).toLocaleDateString('es-ES')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge[suggestion.status]}`}
                  >
                    {statusLabels[suggestion.status]}
                  </span>
                  {isAdmin ? (
                    <select
                      value={suggestion.status}
                      aria-label={`Estado de ${suggestion.title}`}
                      onChange={(event) =>
                        setStatus.mutate({
                          suggestionId: suggestion.id,
                          status: event.target.value,
                        })
                      }
                      className="rounded-lg border border-accent bg-card px-2 py-1 text-xs"
                    >
                      {(
                        Object.entries(statusLabels) as Array<
                          [SuggestionStatus, string]
                        >
                      ).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  ) : null}
                  {canDelete ? (
                    <Button
                      variant="danger"
                      onClick={() => remove.mutate(suggestion.id)}
                      disabled={remove.isPending}
                    >
                      Borrar
                    </Button>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <form onSubmit={onSubmit} noValidate className="mt-4 border-t pt-4">
        <h3 className="mb-2 text-sm font-semibold text-primary">Nueva sugerencia</h3>
        <Field
          label="Título"
          htmlFor="suggestion-title"
          error={form.formState.errors.title?.message}
        >
          <Input id="suggestion-title" {...form.register('title')} />
        </Field>
        <Field
          label="Detalle"
          htmlFor="suggestion-body"
          error={form.formState.errors.body?.message}
        >
          <textarea
            id="suggestion-body"
            rows={3}
            className="w-full rounded-lg border border-accent bg-card px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-accent-soft"
            {...form.register('body')}
          />
        </Field>
        <Button type="submit" disabled={create.isPending}>
          {create.isPending ? 'Enviando…' : 'Enviar'}
        </Button>
      </form>
    </Card>
  );
}
