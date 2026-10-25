import { and, desc, eq } from 'drizzle-orm';
import type { DocumentCategory } from '@comunidad/shared';
import type { Database } from '../../db/client';
import { documents, user } from '../../db/schema';

export interface DocumentRow {
  id: string;
  communityId: string;
  title: string;
  category: DocumentCategory;
  storageKey: string;
  contentType: string;
  sizeBytes: number;
  uploadedByName: string | null;
  createdAt: Date;
}

const columns = {
  id: documents.id,
  communityId: documents.communityId,
  title: documents.title,
  category: documents.category,
  storageKey: documents.storageKey,
  contentType: documents.contentType,
  sizeBytes: documents.sizeBytes,
  uploadedByName: user.name,
  createdAt: documents.createdAt,
} as const;

/** Documentos de la comunidad, de los más recientes a los más antiguos. */
export async function listDocuments(
  db: Database,
  communityId: string,
): Promise<DocumentRow[]> {
  return db
    .select(columns)
    .from(documents)
    .leftJoin(user, eq(documents.uploadedById, user.id))
    .where(eq(documents.communityId, communityId))
    .orderBy(desc(documents.createdAt));
}

export async function findDocumentById(
  db: Database,
  communityId: string,
  documentId: string,
): Promise<DocumentRow | null> {
  const [row] = await db
    .select(columns)
    .from(documents)
    .leftJoin(user, eq(documents.uploadedById, user.id))
    .where(and(eq(documents.id, documentId), eq(documents.communityId, communityId)))
    .limit(1);
  return row ?? null;
}

export async function insertDocument(
  db: Database,
  values: {
    id: string;
    communityId: string;
    title: string;
    category: DocumentCategory;
    storageKey: string;
    contentType: string;
    sizeBytes: number;
    uploadedById: string;
  },
): Promise<DocumentRow> {
  const [row] = await db.insert(documents).values(values).returning();
  if (!row) {
    throw new Error('No se pudo guardar el documento');
  }
  return {
    id: row.id,
    communityId: row.communityId,
    title: row.title,
    category: row.category,
    storageKey: row.storageKey,
    contentType: row.contentType,
    sizeBytes: row.sizeBytes,
    uploadedByName: null,
    createdAt: row.createdAt,
  };
}

export async function deleteDocument(db: Database, documentId: string): Promise<void> {
  await db.delete(documents).where(eq(documents.id, documentId));
}
