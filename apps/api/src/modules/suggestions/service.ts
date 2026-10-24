import type { CreateSuggestionInput } from '@comunidad/shared';
import type { SuggestionStatus } from '@comunidad/shared';
import { recordAuditEvent } from '../../lib/audit';
import type { Database } from '../../db/client';
import { conflict, forbidden, notFound } from '../../lib/errors';
import * as repo from './repository';
import type { SuggestionRow } from './repository';

export interface Actor {
  id: string;
  name: string;
  role: 'owner' | 'admin' | 'member' | 'resident';
}

export async function createSuggestion(
  db: Database,
  actor: Actor,
  communityId: string,
  input: CreateSuggestionInput,
): Promise<SuggestionRow> {
  const suggestion = await repo.createSuggestion(db, {
    communityId,
    title: input.title,
    body: input.body,
    authorId: actor.id,
  });

  await recordAuditEvent(db, {
    communityId,
    actorId: actor.id,
    action: 'suggestion.created',
    targetType: 'suggestion',
    targetId: suggestion.id,
    metadata: { title: suggestion.title },
  });

  return { ...suggestion, authorName: actor.name };
}

export async function setSuggestionStatus(
  db: Database,
  actor: Actor,
  communityId: string,
  suggestionId: string,
  status: SuggestionStatus,
): Promise<void> {
  const existing = await repo.findSuggestionById(db, communityId, suggestionId);
  if (!existing) {
    throw notFound('Sugerencia no encontrada');
  }
  if (existing.status === status) {
    throw conflict('La sugerencia ya tiene ese estado');
  }

  await repo.updateSuggestionStatus(db, suggestionId, status);
  await recordAuditEvent(db, {
    communityId,
    actorId: actor.id,
    action: 'suggestion.status_changed',
    targetType: 'suggestion',
    targetId: suggestionId,
    metadata: { from: existing.status, to: status, title: existing.title },
  });
}

/** Puede borrarla su autor o la administración de la comunidad. */
export async function removeSuggestion(
  db: Database,
  actor: Actor,
  communityId: string,
  suggestionId: string,
): Promise<void> {
  const existing = await repo.findSuggestionById(db, communityId, suggestionId);
  if (!existing) {
    throw notFound('Sugerencia no encontrada');
  }
  const isAuthor = existing.authorId === actor.id;
  const isAdmin = actor.role === 'owner' || actor.role === 'admin';
  if (!isAuthor && !isAdmin) {
    throw forbidden('Solo puedes eliminar tu propia sugerencia');
  }

  await repo.deleteSuggestion(db, suggestionId);
  await recordAuditEvent(db, {
    communityId,
    actorId: actor.id,
    action: 'suggestion.deleted',
    targetType: 'suggestion',
    targetId: suggestionId,
    metadata: { title: existing.title, author: isAuthor ? 'self' : 'admin' },
  });
}
