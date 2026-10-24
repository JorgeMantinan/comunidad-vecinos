import { and, asc, desc, eq, max } from 'drizzle-orm';
import type { AgreementStatus, MeetingStatus } from '@comunidad/shared';
import type { Database } from '../../db/client';
import { agreements, meetingAgendaItems, meetings } from '../../db/schema';
import { newId } from '../../lib/ids';

export interface MeetingRow {
  id: string;
  communityId: string;
  title: string;
  scheduledFor: Date;
  location: string | null;
  status: MeetingStatus;
  minutes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgendaItemRow {
  id: string;
  position: number;
  title: string;
  description: string | null;
}

export interface AgreementRow {
  id: string;
  meetingId: string;
  title: string;
  body: string;
  status: AgreementStatus;
  createdAt: Date;
}

const meetingColumns = {
  id: meetings.id,
  communityId: meetings.communityId,
  title: meetings.title,
  scheduledFor: meetings.scheduledFor,
  location: meetings.location,
  status: meetings.status,
  minutes: meetings.minutes,
  createdAt: meetings.createdAt,
  updatedAt: meetings.updatedAt,
} as const;

/** Reuniones de la comunidad, primero las más recientemente programadas. */
export async function listMeetings(
  db: Database,
  communityId: string,
): Promise<MeetingRow[]> {
  return db
    .select(meetingColumns)
    .from(meetings)
    .where(eq(meetings.communityId, communityId))
    .orderBy(desc(meetings.scheduledFor));
}

export async function findMeetingById(
  db: Database,
  communityId: string,
  meetingId: string,
): Promise<MeetingRow | null> {
  const [row] = await db
    .select(meetingColumns)
    .from(meetings)
    .where(eq(meetings.id, meetingId))
    .limit(1);
  if (!row || row.communityId !== communityId) {
    return null;
  }
  return row;
}

export async function createMeeting(
  db: Database,
  values: {
    communityId: string;
    title: string;
    scheduledFor: Date;
    location: string | null;
    createdById: string;
  },
): Promise<MeetingRow> {
  const [row] = await db
    .insert(meetings)
    .values({ id: newId('mtg'), status: 'planned', ...values })
    .returning(meetingColumns);
  if (!row) {
    throw new Error('No se pudo crear la reunión');
  }
  return row;
}

export async function updateMeeting(
  db: Database,
  meetingId: string,
  values: Partial<{
    title: string;
    scheduledFor: Date;
    location: string | null;
    status: MeetingStatus;
    minutes: string | null;
  }>,
): Promise<void> {
  await db
    .update(meetings)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(meetings.id, meetingId));
}

export async function deleteMeeting(db: Database, meetingId: string): Promise<void> {
  await db.delete(meetings).where(eq(meetings.id, meetingId));
}

export async function listAgenda(
  db: Database,
  meetingId: string,
): Promise<AgendaItemRow[]> {
  return db
    .select({
      id: meetingAgendaItems.id,
      position: meetingAgendaItems.position,
      title: meetingAgendaItems.title,
      description: meetingAgendaItems.description,
    })
    .from(meetingAgendaItems)
    .where(eq(meetingAgendaItems.meetingId, meetingId))
    .orderBy(asc(meetingAgendaItems.position), asc(meetingAgendaItems.createdAt));
}

export async function nextAgendaPosition(
  db: Database,
  meetingId: string,
): Promise<number> {
  const [row] = await db
    .select({ value: max(meetingAgendaItems.position) })
    .from(meetingAgendaItems)
    .where(eq(meetingAgendaItems.meetingId, meetingId));
  return (row?.value ?? 0) + 1;
}

export async function createAgendaItem(
  db: Database,
  values: {
    meetingId: string;
    communityId: string;
    position: number;
    title: string;
    description: string | null;
  },
): Promise<AgendaItemRow> {
  const [row] = await db
    .insert(meetingAgendaItems)
    .values({ id: newId('agi'), ...values })
    .returning();
  if (!row) {
    throw new Error('No se pudo añadir el punto del orden del día');
  }
  return {
    id: row.id,
    position: row.position,
    title: row.title,
    description: row.description,
  };
}

export async function findAgendaItem(
  db: Database,
  meetingId: string,
  itemId: string,
): Promise<AgendaItemRow | null> {
  const [row] = await db
    .select({
      id: meetingAgendaItems.id,
      position: meetingAgendaItems.position,
      title: meetingAgendaItems.title,
      description: meetingAgendaItems.description,
    })
    .from(meetingAgendaItems)
    .where(
      and(
        eq(meetingAgendaItems.id, itemId),
        eq(meetingAgendaItems.meetingId, meetingId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function updateAgendaItem(
  db: Database,
  itemId: string,
  values: Partial<{ title: string; description: string | null }>,
): Promise<void> {
  await db
    .update(meetingAgendaItems)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(meetingAgendaItems.id, itemId));
}

export async function deleteAgendaItem(db: Database, itemId: string): Promise<void> {
  await db.delete(meetingAgendaItems).where(eq(meetingAgendaItems.id, itemId));
}

export async function listAgreements(
  db: Database,
  meetingId: string,
): Promise<AgreementRow[]> {
  return db
    .select({
      id: agreements.id,
      meetingId: agreements.meetingId,
      title: agreements.title,
      body: agreements.body,
      status: agreements.status,
      createdAt: agreements.createdAt,
    })
    .from(agreements)
    .where(eq(agreements.meetingId, meetingId))
    .orderBy(asc(agreements.createdAt));
}

export async function createAgreement(
  db: Database,
  values: {
    communityId: string;
    meetingId: string;
    title: string;
    body: string;
    createdById: string;
  },
): Promise<AgreementRow> {
  const [row] = await db
    .insert(agreements)
    .values({ id: newId('agr'), status: 'proposed', ...values })
    .returning();
  if (!row) {
    throw new Error('No se pudo crear el acuerdo');
  }
  return {
    id: row.id,
    meetingId: row.meetingId,
    title: row.title,
    body: row.body,
    status: row.status,
    createdAt: row.createdAt,
  };
}

export async function findAgreement(
  db: Database,
  meetingId: string,
  agreementId: string,
): Promise<AgreementRow | null> {
  const [row] = await db
    .select({
      id: agreements.id,
      meetingId: agreements.meetingId,
      title: agreements.title,
      body: agreements.body,
      status: agreements.status,
      createdAt: agreements.createdAt,
    })
    .from(agreements)
    .where(eq(agreements.id, agreementId))
    .limit(1);
  if (!row || row.meetingId !== meetingId) {
    return null;
  }
  return row;
}

export async function updateAgreementStatus(
  db: Database,
  agreementId: string,
  status: AgreementStatus,
): Promise<void> {
  await db
    .update(agreements)
    .set({ status, updatedAt: new Date() })
    .where(eq(agreements.id, agreementId));
}
