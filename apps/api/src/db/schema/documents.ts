import { sql } from 'drizzle-orm';
import { check, index, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import type { DocumentCategory } from '@comunidad/shared';
import { user } from './auth';
import { communities } from './communities';
import { incidents } from './participation';

/**
 * Documentación privada: solo se guarda en BD los metadatos; el binario
 * vive en almacenamiento de objetos privado (Vercel Blob) y cada
 * descarga exige una URL firmada de corta duración.
 */
export const documents = pgTable(
  'documents',
  {
    id: text('id').primaryKey(),
    communityId: text('community_id')
      .notNull()
      .references(() => communities.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    category: text('category').$type<DocumentCategory>().notNull(),
    /** Ruta privada en el almacén de objetos (nunca una URL pública). */
    storageKey: text('storage_key').notNull().unique(),
    contentType: text('content_type').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    uploadedById: text('uploaded_by_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('documents_community_category_idx').on(t.communityId, t.category),
    check('documents_size_ck', sql`size_bytes > 0`),
  ],
);

/** Fotografías adjuntas a una incidencia. */
export const incidentPhotos = pgTable(
  'incident_photos',
  {
    id: text('id').primaryKey(),
    incidentId: text('incident_id')
      .notNull()
      .references(() => incidents.id, { onDelete: 'cascade' }),
    communityId: text('community_id')
      .notNull()
      .references(() => communities.id, { onDelete: 'cascade' }),
    storageKey: text('storage_key').notNull().unique(),
    contentType: text('content_type').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    uploadedById: text('uploaded_by_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('incident_photos_incident_idx').on(t.incidentId),
    check('incident_photos_size_ck', sql`size_bytes > 0`),
  ],
);

export type Document = typeof documents.$inferSelect;
export type IncidentPhoto = typeof incidentPhotos.$inferSelect;

/**
 * Plantillas de documentos (modelos de textos: convocatorias, actas…).
 * La generación crea un documento `.txt` en el almacén privado.
 */
export const documentTemplates = pgTable(
  'document_templates',
  {
    id: text('id').primaryKey(),
    communityId: text('community_id')
      .notNull()
      .references(() => communities.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    category: text('category').$type<DocumentCategory>().notNull(),
    content: text('content').notNull(),
    createdById: text('created_by_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('document_templates_community_idx').on(t.communityId)],
);

export type DocumentTemplate = typeof documentTemplates.$inferSelect;
