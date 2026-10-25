import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { CommunityRole, SuggestionView } from '@comunidad/shared';
import { createProfessionalInputSchema } from '@comunidad/shared';
import { Button, Card, ErrorAlert, Field, Input, Spinner } from '../../components/ui';
import {
  useCreateSuggestion,
  useSetSuggestionStatus,
  useSuggestions,
} from '../suggestions/api';
import { useCreateProfessional, useDeleteProfessional, useProfessionals } from './api';

const PROPOSAL_PREFIX = 'Profesional: ';

/** Cuerpo de la propuesta en un formato estable que luego se puede parsear. */
function buildProposalBody(values: {
  trade: string;
  phone?: string | null;
  notes?: string | null;
}): string {
  const lines = [`Oficio: ${values.trade}`];
  if (values.phone) lines.push(`Teléfono: ${values.phone}`);
  if (values.notes) lines.push(`Comentario: ${values.notes}`);
  return lines.join('\n');
}

function extract(pattern: RegExp, body: string): string | null {
  return pattern.exec(body)?.[1]?.trim() ?? null;
}

/** Datos de la propuesta para darla de alta como ficha. */
function proposalToProfessional(suggestion: SuggestionView): {
  name: string;
  trade: string;
  phone: string | null;
  notes: string | null;
} {
  return {
    name: suggestion.title.replace(PROPOSAL_PREFIX, '').trim(),
    trade: extract(/(?:^|\n)Oficio:\s*(.+)/, suggestion.body) ?? 'Sin oficio indicado',
    phone: extract(/(?:^|\n)Teléfono:\s*(.+)/, suggestion.body),
    notes: extract(/(?:^|\n)Comentario:\s*(.+)/, suggestion.body),
  };
}

export function ProfessionalsCard({
  communityId,
  role,
}: {
  communityId: string;
  role: CommunityRole;
}) {
  const professionals = useProfessionals(communityId);
  const create = useCreateProfessional(communityId);
  const remove = useDeleteProfessional(communityId);
  const manage = role === 'owner' || role === 'admin';

  const suggestions = useSuggestions(communityId);
  const createSuggestion = useCreateSuggestion(communityId);
  const setSuggestionStatus = useSetSuggestionStatus(communityId);
  const [showProposal, setShowProposal] = useState(false);
  const [proposalSent, setProposalSent] = useState(false);

  const proposals = (suggestions.data ?? []).filter(
    (item) =>
      item.title.startsWith(PROPOSAL_PREFIX) &&
      (item.status === 'open' || item.status === 'under_review'),
  );

  const form = useForm({
    resolver: zodResolver(createProfessionalInputSchema),
    defaultValues: { name: '', trade: '', phone: '', email: '', notes: '' },
  });

  const onSubmit = form.handleSubmit((values) => {
    create.mutate(
      {
        ...values,
        phone: values.phone || null,
        email: values.email || null,
        notes: values.notes || null,
      },
      { onSuccess: () => form.reset() },
    );
  });

  const professionalForm = useForm({
    resolver: zodResolver(createProfessionalInputSchema),
    defaultValues: { name: '', trade: '', phone: '', notes: '' },
  });

  const onPropose = professionalForm.handleSubmit((values) => {
    createSuggestion.mutate(
      {
        title: `${PROPOSAL_PREFIX}${values.name}`,
        body: buildProposalBody(values),
      },
      {
        onSuccess: () => {
          professionalForm.reset();
          setProposalSent(true);
          setShowProposal(false);
        },
      },
    );
  });

  const onAccept = (suggestion: SuggestionView) => {
    const professional = proposalToProfessional(suggestion);
    create.mutate(professional, {
      onSuccess: () =>
        setSuggestionStatus.mutate({
          suggestionId: suggestion.id,
          status: 'accepted',
        }),
    });
  };

  return (
    <Card title="Profesionales recomendados">
      {professionals.error ? (
        <ErrorAlert message={professionals.error.message} />
      ) : null}
      {create.error ? <ErrorAlert message={create.error.message} /> : null}
      {remove.error ? <ErrorAlert message={remove.error.message} /> : null}
      {createSuggestion.error ? (
        <ErrorAlert message={createSuggestion.error.message} />
      ) : null}

      {professionals.isLoading ? <Spinner /> : null}
      {!professionals.isLoading && (professionals.data?.length ?? 0) === 0 ? (
        <p className="text-sm text-muted">Sin profesionales recomendados.</p>
      ) : null}

      <ul className="divide-y divide-accent-soft">
        {professionals.data?.map((professional) => (
          <li
            key={professional.id}
            className="flex items-start justify-between gap-3 py-3 text-sm"
          >
            <div>
              <p className="font-medium text-body">
                {professional.name}
                <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-xs text-primary">
                  {professional.trade}
                </span>
              </p>
              <p className="text-muted">
                {professional.phone ?? professional.email ?? ''}
              </p>
              {professional.notes ? (
                <p className="text-xs text-subtle">{professional.notes}</p>
              ) : null}
            </div>
            {manage ? (
              <Button
                variant="danger"
                onClick={() => remove.mutate(professional.id)}
                disabled={remove.isPending}
              >
                Borrar
              </Button>
            ) : null}
          </li>
        ))}
      </ul>

      <p className="mt-2 text-xs text-subtle">
        Recomendación vecinal: sin publicidad patrocinada.
      </p>

      {manage && proposals.length > 0 ? (
        <section className="mt-4 border-t pt-4">
          <h3 className="mb-2 text-sm font-semibold text-primary">
            Propuestas del vecindario
          </h3>
          <ul className="divide-y divide-accent-soft">
            {proposals.map((suggestion) => (
              <li
                key={suggestion.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
              >
                <div>
                  <p className="font-medium text-body">
                    {suggestion.title.replace(PROPOSAL_PREFIX, '')}
                  </p>
                  <p className="text-xs text-subtle">
                    Propuesta de {suggestion.authorName ?? 'un vecino'} ·{' '}
                    {new Date(suggestion.createdAt).toLocaleDateString('es-ES')}
                  </p>
                </div>
                <Button
                  onClick={() => onAccept(suggestion)}
                  disabled={create.isPending}
                >
                  {create.isPending ? 'Dando de alta…' : 'Dar de alta'}
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!manage ? (
        <div className="mt-4 border-t pt-4">
          {proposalSent ? (
            <p className="mb-3 text-sm text-muted" role="status">
              Propuesta enviada. La junta la revisará y la dará de alta.
            </p>
          ) : null}
          {showProposal ? (
            <form onSubmit={onPropose} noValidate>
              <h3 className="mb-2 text-sm font-semibold text-primary">
                Proponer profesional
              </h3>
              <div className="flex flex-wrap gap-3">
                <div className="min-w-52 flex-1">
                  <Field
                    label="Nombre"
                    htmlFor="proposal-name"
                    error={professionalForm.formState.errors.name?.message}
                  >
                    <Input id="proposal-name" {...professionalForm.register('name')} />
                  </Field>
                </div>
                <div className="w-48">
                  <Field
                    label="Oficio"
                    htmlFor="proposal-trade"
                    error={professionalForm.formState.errors.trade?.message}
                  >
                    <Input
                      id="proposal-trade"
                      placeholder="Fontanería"
                      {...professionalForm.register('trade')}
                    />
                  </Field>
                </div>
                <div className="w-44">
                  <Field
                    label="Teléfono"
                    htmlFor="proposal-phone"
                    error={professionalForm.formState.errors.phone?.message}
                  >
                    <Input
                      id="proposal-phone"
                      placeholder="600 000 000"
                      {...professionalForm.register('phone')}
                    />
                  </Field>
                </div>
              </div>
              <Field
                label="Comentario"
                htmlFor="proposal-notes"
                error={professionalForm.formState.errors.notes?.message}
              >
                <Input
                  id="proposal-notes"
                  placeholder="Por qué lo recomiendas"
                  {...professionalForm.register('notes')}
                />
              </Field>
              <div className="flex gap-3">
                <Button type="submit" disabled={createSuggestion.isPending}>
                  {createSuggestion.isPending ? 'Enviando…' : 'Enviar propuesta'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowProposal(false)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          ) : (
            <Button variant="secondary" onClick={() => setShowProposal(true)}>
              Proponer profesional
            </Button>
          )}
        </div>
      ) : null}

      {manage ? (
        <form onSubmit={onSubmit} noValidate className="mt-4 border-t pt-4">
          <h3 className="mb-2 text-sm font-semibold text-primary">
            Añadir profesional
          </h3>
          <div className="flex flex-wrap gap-3">
            <div className="min-w-52 flex-1">
              <Field
                label="Nombre"
                htmlFor="professional-name"
                error={form.formState.errors.name?.message}
              >
                <Input id="professional-name" {...form.register('name')} />
              </Field>
            </div>
            <div className="w-48">
              <Field
                label="Oficio"
                htmlFor="professional-trade"
                error={form.formState.errors.trade?.message}
              >
                <Input
                  id="professional-trade"
                  placeholder="Fontanería"
                  {...form.register('trade')}
                />
              </Field>
            </div>
            <div className="w-44">
              <Field
                label="Teléfono"
                htmlFor="professional-phone"
                error={form.formState.errors.phone?.message}
              >
                <Input
                  id="professional-phone"
                  placeholder="600 000 000"
                  {...form.register('phone')}
                />
              </Field>
            </div>
          </div>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? 'Añadiendo…' : 'Añadir'}
          </Button>
        </form>
      ) : null}
    </Card>
  );
}
