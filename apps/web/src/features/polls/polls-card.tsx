import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { CommunityRole, PollStatus } from '@comunidad/shared';
import { POLL_NON_BINDING_NOTE, createPollInputSchema } from '@comunidad/shared';
import { Button, Card, ErrorAlert, Field, Input, Spinner } from '../../components/ui';
import {
  useClosePoll,
  useCreatePoll,
  useDeletePoll,
  usePollDetail,
  usePolls,
  useVotePoll,
} from './api';

const statusLabels: Record<PollStatus, string> = {
  open: 'Abierta',
  closed: 'Cerrada',
};

/** Una opción por línea (mínimo 2, máximo 10). */
const formSchema = z.object({
  question: createPollInputSchema.shape.question,
  optionsText: z
    .string()
    .trim()
    .min(3, 'Escribe al menos dos opciones, una por línea')
    .refine(
      (value) =>
        value
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean).length >= 2,
      'Escribe al menos dos opciones, una por línea',
    ),
  closesOn: z.string().optional(),
});
type FormValues = z.infer<typeof formSchema>;

export function PollsCard({
  communityId,
  role,
}: {
  communityId: string;
  role: CommunityRole;
}) {
  const polls = usePolls(communityId);
  const create = useCreatePoll(communityId);
  const manage = role === 'owner' || role === 'admin';
  const [openId, setOpenId] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { question: '', optionsText: '', closesOn: '' },
  });

  const onSubmit = form.handleSubmit((values) => {
    create.mutate(
      {
        question: values.question,
        options: values.optionsText
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean),
        closesOn: values.closesOn ? new Date(values.closesOn).toISOString() : null,
      },
      { onSuccess: () => form.reset() },
    );
  });

  return (
    <Card title="Encuestas (no vinculantes)">
      {polls.error ? <ErrorAlert message={polls.error.message} /> : null}
      {create.error ? <ErrorAlert message={create.error.message} /> : null}

      {polls.isLoading ? <Spinner /> : null}
      {!polls.isLoading && (polls.data?.length ?? 0) === 0 ? (
        <p className="text-sm text-neutral-600">No hay encuestas abiertas.</p>
      ) : null}

      <ul className="divide-y divide-accent-soft">
        {polls.data?.map((poll) => (
          <li key={poll.id} className="py-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() =>
                  setOpenId((current) => (current === poll.id ? null : poll.id))
                }
                className="text-left hover:bg-accent-soft/40"
                aria-expanded={openId === poll.id}
              >
                <p className="font-medium text-primary">{poll.question}</p>
                <p className="text-neutral-600">
                  {poll.totalVotes} voto{poll.totalVotes === 1 ? '' : 's'}
                  {poll.closesOn
                    ? ` · cierra el ${new Date(poll.closesOn).toLocaleDateString('es-ES')}`
                    : ''}
                </p>
              </button>
              <span
                className={
                  poll.status === 'open'
                    ? 'rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-primary'
                    : 'rounded-full bg-neutral-200 px-2.5 py-0.5 text-xs font-medium text-neutral-600'
                }
              >
                {statusLabels[poll.status]}
              </span>
            </div>
            {openId === poll.id ? (
              <PollDetailSection
                communityId={communityId}
                pollId={poll.id}
                manage={manage}
              />
            ) : null}
          </li>
        ))}
      </ul>

      <p className="mt-3 text-xs text-neutral-500">{POLL_NON_BINDING_NOTE}</p>

      {manage ? (
        <form onSubmit={onSubmit} noValidate className="mt-4 border-t pt-4">
          <h3 className="mb-2 text-sm font-semibold text-primary">Nueva encuesta</h3>
          <Field
            label="Pregunta"
            htmlFor="poll-question"
            error={form.formState.errors.question?.message}
          >
            <Input id="poll-question" {...form.register('question')} />
          </Field>
          <Field
            label="Opciones (una por línea)"
            htmlFor="poll-options"
            error={form.formState.errors.optionsText?.message}
          >
            <textarea
              id="poll-options"
              rows={3}
              className="w-full rounded-lg border border-accent bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-accent-soft"
              {...form.register('optionsText')}
            />
          </Field>
          <Field
            label="Cierra (opcional)"
            htmlFor="poll-closes"
            error={form.formState.errors.closesOn?.message}
          >
            <Input
              id="poll-closes"
              type="datetime-local"
              {...form.register('closesOn')}
            />
          </Field>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? 'Creando…' : 'Crear encuesta'}
          </Button>
        </form>
      ) : null}
    </Card>
  );
}

function PollDetailSection({
  communityId,
  pollId,
  manage,
}: {
  communityId: string;
  pollId: string;
  manage: boolean;
}) {
  const detail = usePollDetail(communityId, pollId);
  const vote = useVotePoll(communityId);
  const close = useClosePoll(communityId);
  const remove = useDeletePoll(communityId);

  if (detail.isLoading) {
    return (
      <div className="mt-2">
        <Spinner />
      </div>
    );
  }
  if (detail.error || !detail.data) {
    return <ErrorAlert message={detail.error?.message ?? 'Encuesta no encontrada'} />;
  }

  const poll = detail.data;
  const maxVotes = Math.max(1, ...poll.options.map((option) => option.votes));

  return (
    <div className="mt-3 space-y-2 rounded-lg bg-accent-soft/40 p-3">
      {vote.error ? <ErrorAlert message={vote.error.message} /> : null}
      {close.error ? <ErrorAlert message={close.error.message} /> : null}
      {remove.error ? <ErrorAlert message={remove.error.message} /> : null}

      {poll.options.map((option) => {
        const selected = poll.myVoteOptionId === option.id;
        const width = Math.round((option.votes / maxVotes) * 100);
        return (
          <div key={option.id} className="text-sm">
            <div className="flex items-center justify-between gap-2">
              <span
                className={selected ? 'font-semibold text-primary' : 'text-neutral-800'}
              >
                {selected ? '✓ ' : ''}
                {option.text}
              </span>
              <span className="flex items-center gap-2">
                <span className="text-neutral-600">
                  {option.votes} voto{option.votes === 1 ? '' : 's'}
                </span>
                {poll.status === 'open' && !poll.myVoteOptionId ? (
                  <Button
                    onClick={() => vote.mutate({ pollId, optionId: option.id })}
                    disabled={vote.isPending}
                  >
                    Votar
                  </Button>
                ) : null}
              </span>
            </div>
            <div className="mt-1 h-2 rounded bg-white">
              <div
                className="h-2 rounded bg-accent"
                style={{ width: `${width}%` }}
                aria-hidden="true"
              />
            </div>
          </div>
        );
      })}

      {manage && poll.status === 'open' ? (
        <div className="flex gap-2 pt-1">
          <Button
            variant="secondary"
            onClick={() => close.mutate(pollId)}
            disabled={close.isPending}
          >
            Cerrar votación
          </Button>
          <Button
            variant="danger"
            onClick={() => remove.mutate(pollId)}
            disabled={remove.isPending}
          >
            Eliminar
          </Button>
        </div>
      ) : null}
    </div>
  );
}
