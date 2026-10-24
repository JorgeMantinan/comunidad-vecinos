import type {
  CreateAnnouncementInput,
  UpdateAnnouncementInput,
} from '@comunidad/shared';
import { recordAuditEvent } from '../../lib/audit';
import type { Database } from '../../db/client';
import { notFound, validationError } from '../../lib/errors';
import * as repo from './repository';
import type { AnnouncementRow } from './repository';

export interface Actor {
  id: string;
  name: string;
}

export type AnnouncementCreated = AnnouncementRow;

/** Publica un aviso. Solo presidentes y administración. */
export async function publishAnnouncement(
  db: Database,
  actor: Actor,
  communityId: string,
  input: CreateAnnouncementInput,
): Promise<AnnouncementCreated> {
  const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
  if (expiresAt && expiresAt.getTime() <= Date.now()) {
    throw validationError('La caducidad del aviso debe estar en el futuro');
  }

  const row = await repo.createAnnouncement(db, {
    communityId,
    title: input.title,
    body: input.body,
    authorId: actor.id,
    expiresAt,
  });

  await recordAuditEvent(db, {
    communityId,
    actorId: actor.id,
    action: 'announcement.created',
    targetType: 'announcement',
    targetId: row.id,
    metadata: { title: row.title },
  });

  return { ...row, authorName: actor.name };
}

export async function editAnnouncement(
  db: Database,
  actor: Actor,
  communityId: string,
  announcementId: string,
  input: UpdateAnnouncementInput,
): Promise<void> {
  const existing = await repo.findAnnouncementById(db, communityId, announcementId);
  if (!existing) {
    throw notFound('Aviso no encontrado');
  }

  const expiresAt =
    input.expiresAt === undefined
      ? undefined
      : input.expiresAt === null
        ? null
        : new Date(input.expiresAt);
  if (expiresAt instanceof Date && expiresAt.getTime() <= Date.now()) {
    throw validationError('La caducidad del aviso debe estar en el futuro');
  }

  await repo.updateAnnouncement(db, announcementId, {
    title: input.title,
    body: input.body,
    expiresAt,
  });

  await recordAuditEvent(db, {
    communityId,
    actorId: actor.id,
    action: 'announcement.updated',
    targetType: 'announcement',
    targetId: announcementId,
    metadata: { fields: Object.keys(input) },
  });
}

export async function removeAnnouncement(
  db: Database,
  actor: Actor,
  communityId: string,
  announcementId: string,
): Promise<void> {
  const existing = await repo.findAnnouncementById(db, communityId, announcementId);
  if (!existing) {
    throw notFound('Aviso no encontrado');
  }

  await repo.deleteAnnouncement(db, announcementId);
  await recordAuditEvent(db, {
    communityId,
    actorId: actor.id,
    action: 'announcement.deleted',
    targetType: 'announcement',
    targetId: announcementId,
    metadata: { title: existing.title },
  });
}
