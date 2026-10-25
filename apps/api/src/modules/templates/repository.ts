import { and, asc, eq } from 'drizzle-orm';
import type { DocumentCategory } from '@comunidad/shared';
import type { Database } from '../../db/client';
import { documentTemplates, user } from '../../db/schema';
import { newId } from '../../lib/ids';

export interface TemplateRow {
  id: string;
  communityId: string;
  name: string;
  category: DocumentCategory;
  content: string;
  createdByName: string | null;
  createdAt: Date;
}

const columns = {
  id: documentTemplates.id,
  communityId: documentTemplates.communityId,
  name: documentTemplates.name,
  category: documentTemplates.category,
  content: documentTemplates.content,
  createdByName: user.name,
  createdAt: documentTemplates.createdAt,
} as const;

export async function listTemplates(
  db: Database,
  communityId: string,
): Promise<TemplateRow[]> {
  return db
    .select(columns)
    .from(documentTemplates)
    .leftJoin(user, eq(documentTemplates.createdById, user.id))
    .where(eq(documentTemplates.communityId, communityId))
    .orderBy(asc(documentTemplates.name));
}

export async function findTemplateById(
  db: Database,
  communityId: string,
  templateId: string,
): Promise<TemplateRow | null> {
  const [row] = await db
    .select(columns)
    .from(documentTemplates)
    .leftJoin(user, eq(documentTemplates.createdById, user.id))
    .where(
      and(
        eq(documentTemplates.id, templateId),
        eq(documentTemplates.communityId, communityId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function insertTemplate(
  db: Database,
  values: {
    communityId: string;
    name: string;
    category: DocumentCategory;
    content: string;
    createdById: string;
  },
): Promise<TemplateRow> {
  const [row] = await db
    .insert(documentTemplates)
    .values({ id: newId('tpl'), ...values })
    .returning();
  if (!row) {
    throw new Error('No se pudo crear la plantilla');
  }
  return {
    id: row.id,
    communityId: row.communityId,
    name: row.name,
    category: row.category,
    content: row.content,
    createdByName: null,
    createdAt: row.createdAt,
  };
}

export async function updateTemplate(
  db: Database,
  templateId: string,
  values: Partial<{
    name: string;
    category: DocumentCategory;
    content: string;
  }>,
): Promise<void> {
  await db
    .update(documentTemplates)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(documentTemplates.id, templateId));
}

export async function deleteTemplate(db: Database, templateId: string): Promise<void> {
  await db.delete(documentTemplates).where(eq(documentTemplates.id, templateId));
}
