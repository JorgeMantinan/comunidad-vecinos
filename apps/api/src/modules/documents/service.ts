import type { UploadDocumentInput } from '@comunidad/shared';
import { MAX_FILE_BYTES } from '@comunidad/shared';
import { recordAuditEvent } from '../../lib/audit';
import type { Database } from '../../db/client';
import { notFound, validationError } from '../../lib/errors';
import { newId } from '../../lib/ids';
import { SIGNED_URL_TTL_MS, type StoragePort } from '../../lib/storage';
import * as repo from './repository';
import type { DocumentRow } from './repository';

export interface Actor {
  id: string;
  name: string;
}

const EXTENSION_BY_TYPE: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'text/plain': '.txt',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
};

function decodeOrThrow(contentBase64: string): Buffer {
  const bytes = Buffer.from(contentBase64, 'base64');
  if (bytes.byteLength === 0) {
    throw validationError('El archivo está vacío');
  }
  if (bytes.byteLength > MAX_FILE_BYTES) {
    throw validationError('El archivo supera el límite de 3 MB');
  }
  return bytes;
}

/** Sube un documento al almacén privado y registra sus metadatos. */
export async function uploadDocument(
  db: Database,
  storage: StoragePort,
  actor: Actor,
  communityId: string,
  input: UploadDocumentInput,
): Promise<DocumentRow> {
  const bytes = decodeOrThrow(input.contentBase64);
  const documentId = newId('doc');
  const extension = EXTENSION_BY_TYPE[input.contentType] ?? '';
  const storageKey = `communities/${communityId}/documents/${documentId}/archivo${extension}`;

  const stored = await storage.put(storageKey, bytes, input.contentType);
  const document = await repo.insertDocument(db, {
    id: documentId,
    communityId,
    title: input.title,
    category: input.category,
    storageKey: stored.key,
    contentType: input.contentType,
    sizeBytes: stored.size,
    uploadedById: actor.id,
  });

  await recordAuditEvent(db, {
    communityId,
    actorId: actor.id,
    action: 'document.uploaded',
    targetType: 'document',
    targetId: document.id,
    metadata: {
      title: document.title,
      category: document.category,
      sizeBytes: document.sizeBytes,
    },
  });

  return { ...document, uploadedByName: actor.name };
}

/** URL firmada de descarga (10 minutos), solo con autorización. */
export async function getDocumentDownload(
  db: Database,
  storage: StoragePort,
  communityId: string,
  documentId: string,
): Promise<{ url: string; expiresInSeconds: number }> {
  const document = await repo.findDocumentById(db, communityId, documentId);
  if (!document) {
    throw notFound('Documento no encontrado');
  }

  const url = await storage.getSignedUrl(document.storageKey, SIGNED_URL_TTL_MS);
  return { url, expiresInSeconds: SIGNED_URL_TTL_MS / 1000 };
}

export async function removeDocument(
  db: Database,
  storage: StoragePort,
  actor: Actor,
  communityId: string,
  documentId: string,
): Promise<void> {
  const document = await repo.findDocumentById(db, communityId, documentId);
  if (!document) {
    throw notFound('Documento no encontrado');
  }

  await storage.delete(document.storageKey);
  await repo.deleteDocument(db, documentId);

  await recordAuditEvent(db, {
    communityId,
    actorId: actor.id,
    action: 'document.deleted',
    targetType: 'document',
    targetId: documentId,
    metadata: { title: document.title },
  });
}
