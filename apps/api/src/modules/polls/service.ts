import type { CreatePollInput, PollStatus } from '@comunidad/shared';
import { recordAuditEvent } from '../../lib/audit';
import type { Database } from '../../db/client';
import { conflict, notFound } from '../../lib/errors';
import * as repo from './repository';
import type { OptionRow, PollRow } from './repository';

export interface Actor {
  id: string;
}

export interface PollDetail {
  poll: PollRow;
  status: PollStatus;
  totalVotes: number;
  options: Array<OptionRow & { votes: number }>;
  myVoteOptionId: string | null;
}

/**
 * Estado efectivo: una encuesta con `closesOn` pasado se considera
 * cerrada aunque su columna siga en `open`.
 */
export function effectiveStatus(poll: PollRow, now = new Date()): PollStatus {
  if (poll.status === 'closed') return 'closed';
  if (poll.closesOn && poll.closesOn.getTime() <= now.getTime()) {
    return 'closed';
  }
  return 'open';
}

export async function getPollDetail(
  db: Database,
  communityId: string,
  pollId: string,
  userId?: string,
): Promise<PollDetail> {
  const poll = await repo.findPollById(db, communityId, pollId);
  if (!poll) {
    throw notFound('Encuesta no encontrada');
  }

  const [options, counts, myVoteOptionId] = await Promise.all([
    repo.listOptions(db, pollId),
    repo.listVoteCounts(db, pollId),
    userId ? repo.findVoteOptionId(db, pollId, userId) : Promise.resolve(null),
  ]);
  const countsByOption = new Map(counts.map((count) => [count.optionId, count.votes]));

  return {
    poll,
    status: effectiveStatus(poll),
    totalVotes: counts.reduce((sum, count) => sum + count.votes, 0),
    options: options.map((option) => ({
      ...option,
      votes: countsByOption.get(option.id) ?? 0,
    })),
    myVoteOptionId,
  };
}

export async function createPoll(
  db: Database,
  actor: Actor,
  communityId: string,
  input: CreatePollInput,
): Promise<PollRow> {
  const poll = await repo.createPollWithOptions(db, {
    communityId,
    question: input.question,
    closesOn: input.closesOn ? new Date(input.closesOn) : null,
    createdById: actor.id,
    options: input.options,
  });

  await recordAuditEvent(db, {
    communityId,
    actorId: actor.id,
    action: 'poll.created',
    targetType: 'poll',
    targetId: poll.id,
    metadata: { question: poll.question, options: input.options.length },
  });

  return poll;
}

/** Un voto por miembro; la encuesta debe estar abierta. */
export async function votePoll(
  db: Database,
  communityId: string,
  pollId: string,
  userId: string,
  optionId: string,
): Promise<PollDetail> {
  const detail = await getPollDetail(db, communityId, pollId, userId);
  if (detail.status === 'closed') {
    throw conflict('La encuesta está cerrada');
  }
  if (detail.myVoteOptionId) {
    throw conflict('Ya has votado esta encuesta');
  }
  if (!detail.options.some((option) => option.id === optionId)) {
    throw notFound('La opción indicada no pertenece a esta encuesta');
  }

  await repo.insertVote(db, {
    pollId,
    communityId,
    optionId,
    userId,
  });

  return getPollDetail(db, communityId, pollId, userId);
}

export async function closePoll(
  db: Database,
  actor: Actor,
  communityId: string,
  pollId: string,
): Promise<void> {
  const poll = await repo.findPollById(db, communityId, pollId);
  if (!poll) {
    throw notFound('Encuesta no encontrada');
  }
  if (poll.status === 'closed') {
    throw conflict('La encuesta ya está cerrada');
  }

  await repo.closePoll(db, pollId);
  await recordAuditEvent(db, {
    communityId,
    actorId: actor.id,
    action: 'poll.closed',
    targetType: 'poll',
    targetId: pollId,
    metadata: { question: poll.question },
  });
}

export async function removePoll(
  db: Database,
  actor: Actor,
  communityId: string,
  pollId: string,
): Promise<void> {
  const poll = await repo.findPollById(db, communityId, pollId);
  if (!poll) {
    throw notFound('Encuesta no encontrada');
  }

  await repo.deletePoll(db, pollId);
  await recordAuditEvent(db, {
    communityId,
    actorId: actor.id,
    action: 'poll.deleted',
    targetType: 'poll',
    targetId: pollId,
    metadata: { question: poll.question },
  });
}
