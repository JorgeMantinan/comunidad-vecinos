import type {
  CreateIncidentInput,
  UpdateIncidentInput,
  UploadPhotoInput,
} from '@comunidad/shared';
import { MAX_FILE_BYTES } from '@comunidad/shared';
import { recordAuditEvent } from '../../lib/audit';
import type { Database } from '../../db/client';
import { forbidden, notFound, validationError } from '../../lib/errors';
import { newId } from '../../lib/ids';
import { SIGNED_URL_TTL_MS, type StoragePort } from '../../lib/storage';
import * as repo from './repository';
import type { IncidentRow } from './repository';

export interface Actor {
  id: string;
  name: string;
}

/** Cualquier miembro (incluida la residente) puede reportar averías. */
export async function reportIncident(
  db: Database,
  actor: Actor,
  communityId: string,
  input: CreateIncidentInput,
): Promise<IncidentRow> {
  const incident = await repo.createIncident(db, {
    communityId,
    title: input.title,
    description: input.description,
    reportedById: actor.id,
  });

  await recordAuditEvent(db, {
    communityId,
    actorId: actor.id,
    action: 'incident.created',
    targetType: 'incident',
    targetId: incident.id,
    metadata: { title: incident.title },
  });

  return { ...incident, reportedByName: actor.name };
}

export async function updateIncident(
  db: Database,
  actor: Actor,
  communityId: string,
  incidentId: string,
  input: UpdateIncidentInput,
): Promise<void> {
  const existing = await repo.findIncidentById(db, communityId, incidentId);
  if (!existing) {
    throw notFound('Incidencia no encontrada');
  }

  const values: Parameters<typeof repo.updateIncident>[2] = {};
  if (input.title !== undefined) values.title = input.title;
  if (input.description !== undefined) values.description = input.description;

  const statusChanged = input.status !== undefined && input.status !== existing.status;
  if (input.status !== undefined) {
    values.status = input.status;
    // Al resolver se marca la fecha; al reabrir se limpia.
    values.resolvedAt =
      input.status === 'resolved' ? (existing.resolvedAt ?? new Date()) : null;
  }

  if (Object.keys(values).length === 0) {
    return;
  }

  await repo.updateIncident(db, incidentId, values);

  if (statusChanged) {
    await recordAuditEvent(db, {
      communityId,
      actorId: actor.id,
      action: 'incident.status_changed',
      targetType: 'incident',
      targetId: incidentId,
      metadata: { from: existing.status, to: input.status, title: existing.title },
    });
  } else {
    await recordAuditEvent(db, {
      communityId,
      actorId: actor.id,
      action: 'incident.updated',
      targetType: 'incident',
      targetId: incidentId,
      metadata: { fields: Object.keys(values) },
    });
  }
}

export async function removeIncident(
  db: Database,
  actor: Actor,
  communityId: string,
  incidentId: string,
): Promise<void> {
  const existing = await repo.findIncidentById(db, communityId, incidentId);
  if (!existing) {
    throw notFound('Incidencia no encontrada');
  }

  await repo.deleteIncident(db, incidentId);
  await recordAuditEvent(db, {
    communityId,
    actorId: actor.id,
    action: 'incident.deleted',
    targetType: 'incident',
    targetId: incidentId,
    metadata: { title: existing.title },
  });
}

const PHOTO_EXTENSION_BY_TYPE: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

function decodePhotoOrThrow(contentBase64: string): Buffer {
  const bytes = Buffer.from(contentBase64, 'base64');
  if (bytes.byteLength === 0) {
    throw validationError('La fotografía está vacía');
  }
  if (bytes.byteLength > MAX_FILE_BYTES) {
    throw validationError('La fotografía supera el límite de 3 MB');
  }
  return bytes;
}

export interface PhotoActor {
  id: string;
  name: string;
}

export interface PhotoDeleterActor {
  id: string;
  role: 'owner' | 'admin' | 'member' | 'resident';
}

/** Adjunta una fotografía a una incidencia (cualquier miembro). */
export async function uploadPhoto(
  db: Database,
  storage: StoragePort,
  actor: PhotoActor,
  communityId: string,
  incidentId: string,
  input: UploadPhotoInput,
): Promise<repo.PhotoRow> {
  const incident = await repo.findIncidentById(db, communityId, incidentId);
  if (!incident) {
    throw notFound('Incidencia no encontrada');
  }

  const bytes = decodePhotoOrThrow(input.contentBase64);
  const photoId = newId('pho');
  const extension = PHOTO_EXTENSION_BY_TYPE[input.contentType] ?? '';
  const storageKey = `communities/${communityId}/incidents/${incidentId}/photos/${photoId}${extension}`;

  const stored = await storage.put(storageKey, bytes, input.contentType);
  const photo = await repo.insertPhoto(db, {
    id: photoId,
    incidentId,
    communityId,
    storageKey: stored.key,
    contentType: input.contentType,
    sizeBytes: stored.size,
    uploadedById: actor.id,
  });

  await recordAuditEvent(db, {
    communityId,
    actorId: actor.id,
    action: 'incident.photo_added',
    targetType: 'incident',
    targetId: incidentId,
    metadata: { photoId, sizeBytes: photo.sizeBytes },
  });

  return { ...photo, uploadedByName: actor.name };
}

/** URL firmada (10 min) para ver una fotografía. */
export async function getPhotoDownload(
  db: Database,
  storage: StoragePort,
  communityId: string,
  incidentId: string,
  photoId: string,
): Promise<{ url: string; expiresInSeconds: number }> {
  const photo = await repo.findPhotoById(db, communityId, photoId);
  if (!photo || photo.incidentId !== incidentId) {
    throw notFound('Fotografía no encontrada');
  }

  const url = await storage.getSignedUrl(photo.storageKey, SIGNED_URL_TTL_MS);
  return { url, expiresInSeconds: SIGNED_URL_TTL_MS / 1000 };
}

/** La pueden borrar su autor o la administración de la comunidad. */
export async function removePhoto(
  db: Database,
  storage: StoragePort,
  actor: PhotoDeleterActor,
  communityId: string,
  incidentId: string,
  photoId: string,
): Promise<void> {
  const photo = await repo.findPhotoById(db, communityId, photoId);
  if (!photo || photo.incidentId !== incidentId) {
    throw notFound('Fotografía no encontrada');
  }
  const isAdmin = actor.role === 'owner' || actor.role === 'admin';
  if (!isAdmin && photo.uploadedById !== actor.id) {
    throw forbidden('Solo puedes eliminar tus propias fotografías');
  }

  await storage.delete(photo.storageKey);
  await repo.deletePhoto(db, photoId);

  await recordAuditEvent(db, {
    communityId,
    actorId: actor.id,
    action: 'incident.photo_removed',
    targetType: 'incident',
    targetId: incidentId,
    metadata: { photoId },
  });
}
