import { index, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { user } from './auth';
import { communities } from './communities';

/**
 * Avisos publicados por la presidencia o la administración.
 * Los miembros los leen; nadie más puede publicar.
 */
export const announcements = pgTable(
  'announcements',
  {
    id: text('id').primaryKey(),
    communityId: text('community_id')
      .notNull()
      .references(() => communities.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    body: text('body').notNull(),
    authorId: text('author_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    publishedAt: timestamp('published_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    /** Caducidad opcional: el aviso deja de mostrarse a partir de aquí. */
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('announcements_community_published_idx').on(t.communityId, t.publishedAt),
  ],
);

export type Announcement = typeof announcements.$inferSelect;
