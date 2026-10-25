import type { CreateTemplateInput, UpdateTemplateInput } from '@comunidad/shared';
import { recordAuditEvent } from '../../lib/audit';
import type { Database } from '../../db/client';
import { notFound } from '../../lib/errors';
import { newId } from '../../lib/ids';
import type { StoragePort } from '../../lib/storage';
import { insertDocument } from '../documents/repository';
import type { DocumentRow } from '../documents/repository';
import * as repo from './repository';
import type { TemplateRow } from './repository';

export interface Actor {
  id: string;
  name: string;
}

export async function addTemplate(
  db: Database,
  actor: Actor,
  communityId: string,
  input: CreateTemplateInput,
): Promise<TemplateRow> {
  const template = await repo.insertTemplate(db, {
    communityId,
    name: input.name,
    category: input.category,
    content: input.content,
    createdById: actor.id,
  });

  await recordAuditEvent(db, {
    communityId,
    actorId: actor.id,
    action: 'template.created',
    targetType: 'template',
    targetId: template.id,
    metadata: { name: template.name, category: template.category },
  });

  return { ...template, createdByName: actor.name };
}

export async function editTemplate(
  db: Database,
  actor: Actor,
  communityId: string,
  templateId: string,
  input: UpdateTemplateInput,
): Promise<void> {
  const existing = await repo.findTemplateById(db, communityId, templateId);
  if (!existing) {
    throw notFound('Plantilla no encontrada');
  }

  const values: Parameters<typeof repo.updateTemplate>[2] = {};
  if (input.name !== undefined) values.name = input.name;
  if (input.category !== undefined) values.category = input.category;
  if (input.content !== undefined) values.content = input.content;
  if (Object.keys(values).length === 0) {
    return;
  }

  await repo.updateTemplate(db, templateId, values);
  await recordAuditEvent(db, {
    communityId,
    actorId: actor.id,
    action: 'template.updated',
    targetType: 'template',
    targetId: templateId,
    metadata: { fields: Object.keys(values) },
  });
}

export async function removeTemplate(
  db: Database,
  actor: Actor,
  communityId: string,
  templateId: string,
): Promise<void> {
  const existing = await repo.findTemplateById(db, communityId, templateId);
  if (!existing) {
    throw notFound('Plantilla no encontrada');
  }

  await repo.deleteTemplate(db, templateId);
  await recordAuditEvent(db, {
    communityId,
    actorId: actor.id,
    action: 'template.deleted',
    targetType: 'template',
    targetId: templateId,
    metadata: { name: existing.name },
  });
}

/**
 * Genera un documento `.txt` a partir de la plantilla y lo guarda en
 * el almacén privado (mismo circuito que la subida manual).
 */
export async function generateDocumentFromTemplate(
  db: Database,
  storage: StoragePort,
  actor: Actor,
  communityId: string,
  templateId: string,
  input: { title?: string },
): Promise<DocumentRow> {
  const template = await repo.findTemplateById(db, communityId, templateId);
  if (!template) {
    throw notFound('Plantilla no encontrada');
  }

  const bytes = Buffer.from(template.content, 'utf8');
  const documentId = newId('doc');
  const storageKey = `communities/${communityId}/documents/${documentId}/plantilla.txt`;

  const stored = await storage.put(storageKey, bytes, 'text/plain');
  const document = await insertDocument(db, {
    id: documentId,
    communityId,
    title: input.title ?? template.name,
    category: template.category,
    storageKey: stored.key,
    contentType: 'text/plain',
    sizeBytes: stored.size,
    uploadedById: actor.id,
  });

  await recordAuditEvent(db, {
    communityId,
    actorId: actor.id,
    action: 'document.generated',
    targetType: 'document',
    targetId: documentId,
    metadata: { templateId, templateName: template.name },
  });

  return { ...document, uploadedByName: actor.name };
}
