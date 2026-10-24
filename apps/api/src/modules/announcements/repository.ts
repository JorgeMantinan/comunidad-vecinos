import { and, desc, eq, gt, isNull, or } from 'drizzle-orm';
import type { Database } from '../../db/client';
import { announcements, user } from '../../db/schema';
import { newId } from '../../lib/ids';

export interface AnnouncementRow {
  id: string;
  communityId: string;
  title: string;
  body: string;
  authorName: string | null;
  publishedAt: Date;
  expiresAt: Date | null;
}

interface AnnouncementValues {
  communityId: string;
  title: string;
  body: string;
  authorId: string;
  expiresAt: Date | null;
}

const columns = {
  id: announcements.id,
  communityId: announcements.communityId,
  title: announcements.title,
  body: announcements.body,
  authorName: user.name,
  publishedAt: announcements.publishedAt,
  expiresAt: announcements.expiresAt,
} as const;

/** Avisos vigentes de la comunidad (los caducados no se muestran). */
export async function listAnnouncements(
  db: Database,
  communityId: string,
  now = new Date(),
): Promise<AnnouncementRow[]> {
  return db
    .select(columns)
    .from(announcements)
    .leftJoin(user, eq(announcements.authorId, user.id))
    .where(
      and(
        eq(announcements.communityId, communityId),
        or(isNull(announcements.expiresAt), gt(announcements.expiresAt, now)),
      ),
    )
    .orderBy(desc(announcements.publishedAt));
}

export async function findAnnouncementById(
  db: Database,
  communityId: string,
  announcementId: string,
): Promise<AnnouncementRow | null> {
  const [row] = await db
    .select(columns)
    .from(announcements)
    .leftJoin(user, eq(announcements.authorId, user.id))
    .where(
      and(
        eq(announcements.communityId, communityId),
        eq(announcements.id, announcementId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function createAnnouncement(
  db: Database,
  values: AnnouncementValues,
): Promise<AnnouncementRow> {
  const [row] = await db
    .insert(announcements)
    .values({ id: newId('ann'), ...values })
    .returning();
  if (!row) {
    throw new Error('No se pudo crear el aviso');
  }
  return {
    id: row.id,
    communityId: row.communityId,
    title: row.title,
    body: row.body,
    authorName: null,
    publishedAt: row.publishedAt,
    expiresAt: row.expiresAt,
  };
}

export async function updateAnnouncement(
  db: Database,
  announcementId: string,
  values: Partial<AnnouncementValues>,
): Promise<void> {
  await db
    .update(announcements)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(announcements.id, announcementId));
}

export async function deleteAnnouncement(
  db: Database,
  announcementId: string,
): Promise<void> {
  await db.delete(announcements).where(eq(announcements.id, announcementId));
}
