import { and, asc, desc, eq, sql } from 'drizzle-orm';
import type { PollStatus } from '@comunidad/shared';
import type { Database } from '../../db/client';
import { pollOptions, pollVotes, polls } from '../../db/schema';
import { newId } from '../../lib/ids';

export interface PollRow {
  id: string;
  communityId: string;
  question: string;
  status: PollStatus;
  closesOn: Date | null;
  createdAt: Date;
}

export interface PollWithVotesRow extends PollRow {
  totalVotes: number;
}

export interface OptionRow {
  id: string;
  position: number;
  text: string;
}

const columns = {
  id: polls.id,
  communityId: polls.communityId,
  question: polls.question,
  status: polls.status,
  closesOn: polls.closesOn,
  createdAt: polls.createdAt,
} as const;

const countColumn = sql<number>`count(${pollVotes.id})`;

/** Encuestas de la comunidad con sus recuentos, primero las más recientes. */
export async function listPolls(
  db: Database,
  communityId: string,
): Promise<PollWithVotesRow[]> {
  const rows = await db
    .select({ ...columns, totalVotes: countColumn })
    .from(polls)
    .leftJoin(pollVotes, eq(pollVotes.pollId, polls.id))
    .where(eq(polls.communityId, communityId))
    .groupBy(polls.id)
    .orderBy(desc(polls.createdAt));
  return rows.map((row) => ({ ...row, totalVotes: Number(row.totalVotes) }));
}

export async function findPollById(
  db: Database,
  communityId: string,
  pollId: string,
): Promise<PollRow | null> {
  const [row] = await db
    .select(columns)
    .from(polls)
    .where(eq(polls.id, pollId))
    .limit(1);
  if (!row || row.communityId !== communityId) {
    return null;
  }
  return row;
}

export async function createPollWithOptions(
  db: Database,
  values: {
    communityId: string;
    question: string;
    closesOn: Date | null;
    createdById: string;
    options: string[];
  },
): Promise<PollRow> {
  return db.transaction(async (tx) => {
    const [poll] = await tx
      .insert(polls)
      .values({
        id: newId('pll'),
        communityId: values.communityId,
        question: values.question,
        closesOn: values.closesOn,
        createdById: values.createdById,
        status: 'open',
      })
      .returning(columns);
    if (!poll) {
      throw new Error('No se pudo crear la encuesta');
    }

    await tx.insert(pollOptions).values(
      values.options.map((text, index) => ({
        id: newId('opt'),
        pollId: poll.id,
        communityId: values.communityId,
        position: index + 1,
        text,
      })),
    );

    return poll;
  });
}

export async function listOptions(db: Database, pollId: string): Promise<OptionRow[]> {
  return db
    .select({
      id: pollOptions.id,
      position: pollOptions.position,
      text: pollOptions.text,
    })
    .from(pollOptions)
    .where(eq(pollOptions.pollId, pollId))
    .orderBy(asc(pollOptions.position));
}

export async function listVoteCounts(
  db: Database,
  pollId: string,
): Promise<Array<{ optionId: string; votes: number }>> {
  const rows = await db
    .select({ optionId: pollVotes.optionId, votes: countColumn })
    .from(pollVotes)
    .where(eq(pollVotes.pollId, pollId))
    .groupBy(pollVotes.optionId);
  return rows.map((row) => ({
    optionId: row.optionId,
    votes: Number(row.votes),
  }));
}

export async function findVoteOptionId(
  db: Database,
  pollId: string,
  userId: string,
): Promise<string | null> {
  const [row] = await db
    .select({ optionId: pollVotes.optionId })
    .from(pollVotes)
    .where(and(eq(pollVotes.pollId, pollId), eq(pollVotes.userId, userId)))
    .limit(1);
  return row?.optionId ?? null;
}

export async function insertVote(
  db: Database,
  values: {
    pollId: string;
    communityId: string;
    optionId: string;
    userId: string;
  },
): Promise<void> {
  await db.insert(pollVotes).values({ id: newId('vot'), ...values });
}

export async function closePoll(db: Database, pollId: string): Promise<void> {
  await db
    .update(polls)
    .set({ status: 'closed', updatedAt: new Date() })
    .where(eq(polls.id, pollId));
}

export async function deletePoll(db: Database, pollId: string): Promise<void> {
  await db.delete(polls).where(eq(polls.id, pollId));
}
