import { and, desc, eq } from 'drizzle-orm';
import type { SuggestionStatus } from '@comunidad/shared';
import type { Database } from '../../db/client';
import { suggestions, user } from '../../db/schema';
import { newId } from '../../lib/ids';

export interface SuggestionRow {
  id: string;
  communityId: string;
  title: string;
  body: string;
  status: SuggestionStatus;
  authorId: string | null;
  authorName: string | null;
  createdAt: Date;
}

const columns = {
  id: suggestions.id,
  communityId: suggestions.communityId,
  title: suggestions.title,
  body: suggestions.body,
  status: suggestions.status,
  authorId: suggestions.authorId,
  authorName: user.name,
  createdAt: suggestions.createdAt,
} as const;

export async function listSuggestions(
  db: Database,
  communityId: string,
): Promise<SuggestionRow[]> {
  return db
    .select(columns)
    .from(suggestions)
    .leftJoin(user, eq(suggestions.authorId, user.id))
    .where(eq(suggestions.communityId, communityId))
    .orderBy(desc(suggestions.createdAt));
}

export async function findSuggestionById(
  db: Database,
  communityId: string,
  suggestionId: string,
): Promise<SuggestionRow | null> {
  const [row] = await db
    .select(columns)
    .from(suggestions)
    .leftJoin(user, eq(suggestions.authorId, user.id))
    .where(
      and(eq(suggestions.id, suggestionId), eq(suggestions.communityId, communityId)),
    )
    .limit(1);
  return row ?? null;
}

export async function createSuggestion(
  db: Database,
  values: {
    communityId: string;
    title: string;
    body: string;
    authorId: string;
  },
): Promise<SuggestionRow> {
  const [row] = await db
    .insert(suggestions)
    .values({ id: newId('sgs'), status: 'open', ...values })
    .returning();
  if (!row) {
    throw new Error('No se pudo crear la sugerencia');
  }
  return {
    id: row.id,
    communityId: row.communityId,
    title: row.title,
    body: row.body,
    status: row.status,
    authorId: row.authorId,
    authorName: null,
    createdAt: row.createdAt,
  };
}

export async function updateSuggestionStatus(
  db: Database,
  suggestionId: string,
  status: SuggestionStatus,
): Promise<void> {
  await db
    .update(suggestions)
    .set({ status, updatedAt: new Date() })
    .where(eq(suggestions.id, suggestionId));
}

export async function deleteSuggestion(
  db: Database,
  suggestionId: string,
): Promise<void> {
  await db.delete(suggestions).where(eq(suggestions.id, suggestionId));
}
