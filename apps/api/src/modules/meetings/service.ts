import type {
  CreateAgendaItemInput,
  CreateAgreementInput,
  CreateMeetingInput,
  UpdateAgendaItemInput,
  UpdateMeetingInput,
} from '@comunidad/shared';
import { recordAuditEvent } from '../../lib/audit';
import type { Database } from '../../db/client';
import { notFound } from '../../lib/errors';
import * as repo from './repository';
import type { AgreementRow, AgendaItemRow, MeetingRow } from './repository';

export interface Actor {
  id: string;
}

export interface MeetingDetail {
  meeting: MeetingRow;
  agenda: AgendaItemRow[];
  agreements: AgreementRow[];
}

export async function getMeetingDetail(
  db: Database,
  communityId: string,
  meetingId: string,
): Promise<MeetingDetail> {
  const meeting = await repo.findMeetingById(db, communityId, meetingId);
  if (!meeting) {
    throw notFound('Reunión no encontrada');
  }
  const [agenda, agreements] = await Promise.all([
    repo.listAgenda(db, meetingId),
    repo.listAgreements(db, meetingId),
  ]);
  return { meeting, agenda, agreements };
}

export async function createMeeting(
  db: Database,
  actor: Actor,
  communityId: string,
  input: CreateMeetingInput,
): Promise<MeetingRow> {
  const meeting = await repo.createMeeting(db, {
    communityId,
    title: input.title,
    scheduledFor: new Date(input.scheduledFor),
    location: input.location ?? null,
    createdById: actor.id,
  });

  await recordAuditEvent(db, {
    communityId,
    actorId: actor.id,
    action: 'meeting.created',
    targetType: 'meeting',
    targetId: meeting.id,
    metadata: {
      title: meeting.title,
      scheduledFor: meeting.scheduledFor.toISOString(),
    },
  });

  return meeting;
}

export async function updateMeeting(
  db: Database,
  actor: Actor,
  communityId: string,
  meetingId: string,
  input: UpdateMeetingInput,
): Promise<void> {
  const existing = await repo.findMeetingById(db, communityId, meetingId);
  if (!existing) {
    throw notFound('Reunión no encontrada');
  }

  const values: Parameters<typeof repo.updateMeeting>[2] = {};
  if (input.title !== undefined) values.title = input.title;
  if (input.scheduledFor !== undefined) {
    values.scheduledFor = new Date(input.scheduledFor);
  }
  if (input.location !== undefined) values.location = input.location;
  if (input.status !== undefined) values.status = input.status;
  if (input.minutes !== undefined) values.minutes = input.minutes;

  if (Object.keys(values).length === 0) {
    return;
  }

  await repo.updateMeeting(db, meetingId, values);
  await recordAuditEvent(db, {
    communityId,
    actorId: actor.id,
    action: 'meeting.updated',
    targetType: 'meeting',
    targetId: meetingId,
    metadata: { fields: Object.keys(values) },
  });
}

export async function removeMeeting(
  db: Database,
  actor: Actor,
  communityId: string,
  meetingId: string,
): Promise<void> {
  const existing = await repo.findMeetingById(db, communityId, meetingId);
  if (!existing) {
    throw notFound('Reunión no encontrada');
  }

  await repo.deleteMeeting(db, meetingId);
  await recordAuditEvent(db, {
    communityId,
    actorId: actor.id,
    action: 'meeting.deleted',
    targetType: 'meeting',
    targetId: meetingId,
    metadata: { title: existing.title },
  });
}

export async function addAgendaItem(
  db: Database,
  actor: Actor,
  communityId: string,
  meetingId: string,
  input: CreateAgendaItemInput,
): Promise<AgendaItemRow> {
  const meeting = await repo.findMeetingById(db, communityId, meetingId);
  if (!meeting) {
    throw notFound('Reunión no encontrada');
  }

  const position = await repo.nextAgendaPosition(db, meetingId);
  const item = await repo.createAgendaItem(db, {
    meetingId,
    communityId,
    position,
    title: input.title,
    description: input.description ?? null,
  });

  await recordAuditEvent(db, {
    communityId,
    actorId: actor.id,
    action: 'agenda.item_added',
    targetType: 'meeting',
    targetId: meetingId,
    metadata: { title: item.title, position },
  });

  return item;
}

export async function editAgendaItem(
  db: Database,
  actor: Actor,
  communityId: string,
  meetingId: string,
  itemId: string,
  input: UpdateAgendaItemInput,
): Promise<void> {
  const item = await repo.findAgendaItem(db, meetingId, itemId);
  if (!item) {
    throw notFound('Punto del orden del día no encontrado');
  }

  const values: Partial<{ title: string; description: string | null }> = {};
  if (input.title !== undefined) values.title = input.title;
  if (input.description !== undefined) values.description = input.description;
  if (Object.keys(values).length === 0) {
    return;
  }

  await repo.updateAgendaItem(db, itemId, values);
  await recordAuditEvent(db, {
    communityId,
    actorId: actor.id,
    action: 'agenda.item_updated',
    targetType: 'meeting',
    targetId: meetingId,
    metadata: { itemId },
  });
}

export async function removeAgendaItem(
  db: Database,
  actor: Actor,
  communityId: string,
  meetingId: string,
  itemId: string,
): Promise<void> {
  const item = await repo.findAgendaItem(db, meetingId, itemId);
  if (!item) {
    throw notFound('Punto del orden del día no encontrado');
  }

  await repo.deleteAgendaItem(db, itemId);
  await recordAuditEvent(db, {
    communityId,
    actorId: actor.id,
    action: 'agenda.item_removed',
    targetType: 'meeting',
    targetId: meetingId,
    metadata: { title: item.title },
  });
}

export async function addAgreement(
  db: Database,
  actor: Actor,
  communityId: string,
  meetingId: string,
  input: CreateAgreementInput,
): Promise<AgreementRow> {
  const meeting = await repo.findMeetingById(db, communityId, meetingId);
  if (!meeting) {
    throw notFound('Reunión no encontrada');
  }

  const agreement = await repo.createAgreement(db, {
    communityId,
    meetingId,
    title: input.title,
    body: input.body,
    createdById: actor.id,
  });

  await recordAuditEvent(db, {
    communityId,
    actorId: actor.id,
    action: 'agreement.created',
    targetType: 'agreement',
    targetId: agreement.id,
    metadata: { title: agreement.title, meetingId },
  });

  return agreement;
}

export async function setAgreementStatus(
  db: Database,
  actor: Actor,
  communityId: string,
  meetingId: string,
  agreementId: string,
  status: AgreementRow['status'],
): Promise<void> {
  const agreement = await repo.findAgreement(db, meetingId, agreementId);
  if (!agreement) {
    throw notFound('Acuerdo no encontrado');
  }

  await repo.updateAgreementStatus(db, agreementId, status);
  await recordAuditEvent(db, {
    communityId,
    actorId: actor.id,
    action: 'agreement.status_changed',
    targetType: 'agreement',
    targetId: agreementId,
    metadata: { from: agreement.status, to: status, title: agreement.title },
  });
}
