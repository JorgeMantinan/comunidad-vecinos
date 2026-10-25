import { asc, eq, inArray } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import type { Database } from '../../db/client';
import {
  announcements,
  auditEvents,
  communities,
  communityMemberships,
  documents,
  incidentPhotos,
  incidents,
  invitations,
  pollOptions,
  pollVotes,
  polls,
  suggestions,
  tasks,
  units,
  user,
} from '../../db/schema';

/**
 * Consultas de la cuenta personal. Todas van filtradas por `userId`:
 * aquí nunca se leen datos de otras personas.
 */

export interface ProfileRow {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  createdAt: Date;
}

export async function findProfile(
  db: Database,
  userId: string,
): Promise<ProfileRow | null> {
  const [row] = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  return row ?? null;
}

export interface UserCommunityRow {
  id: string;
  name: string;
  address: string | null;
  role: string;
  joinedAt: Date;
}

export async function listUserCommunities(
  db: Database,
  userId: string,
): Promise<UserCommunityRow[]> {
  return db
    .select({
      id: communities.id,
      name: communities.name,
      address: communities.address,
      role: communityMemberships.role,
      joinedAt: communityMemberships.createdAt,
    })
    .from(communityMemberships)
    .innerJoin(communities, eq(communityMemberships.communityId, communities.id))
    .where(eq(communityMemberships.userId, userId))
    .orderBy(asc(communities.name));
}

export async function listOwnedUnits(
  db: Database,
  userId: string,
): Promise<
  Array<{
    communityId: string;
    communityName: string;
    portal: string | null;
    number: string;
  }>
> {
  return db
    .select({
      communityId: communities.id,
      communityName: communities.name,
      portal: units.portal,
      number: units.number,
    })
    .from(units)
    .innerJoin(communities, eq(units.communityId, communities.id))
    .where(eq(units.ownerId, userId))
    .orderBy(asc(units.number));
}

export async function listInvitationsSent(
  db: Database,
  userId: string,
): Promise<
  Array<{
    communityId: string;
    communityName: string;
    email: string;
    role: string;
    createdAt: Date;
    expiresAt: Date;
    acceptedAt: Date | null;
    revokedAt: Date | null;
  }>
> {
  return db
    .select({
      communityId: communities.id,
      communityName: communities.name,
      email: invitations.email,
      role: invitations.role,
      createdAt: invitations.createdAt,
      expiresAt: invitations.expiresAt,
      acceptedAt: invitations.acceptedAt,
      revokedAt: invitations.revokedAt,
    })
    .from(invitations)
    .innerJoin(communities, eq(invitations.communityId, communities.id))
    .where(eq(invitations.invitedById, userId))
    .orderBy(asc(invitations.createdAt));
}

export async function listAuthoredAnnouncements(
  db: Database,
  userId: string,
): Promise<
  Array<{
    communityId: string;
    communityName: string;
    title: string;
    body: string;
    publishedAt: Date;
  }>
> {
  return db
    .select({
      communityId: communities.id,
      communityName: communities.name,
      title: announcements.title,
      body: announcements.body,
      publishedAt: announcements.publishedAt,
    })
    .from(announcements)
    .innerJoin(communities, eq(announcements.communityId, communities.id))
    .where(eq(announcements.authorId, userId))
    .orderBy(asc(announcements.publishedAt));
}

export async function listAuthoredSuggestions(
  db: Database,
  userId: string,
): Promise<
  Array<{
    communityId: string;
    communityName: string;
    title: string;
    body: string;
    status: string;
    createdAt: Date;
  }>
> {
  return db
    .select({
      communityId: communities.id,
      communityName: communities.name,
      title: suggestions.title,
      body: suggestions.body,
      status: suggestions.status,
      createdAt: suggestions.createdAt,
    })
    .from(suggestions)
    .innerJoin(communities, eq(suggestions.communityId, communities.id))
    .where(eq(suggestions.authorId, userId))
    .orderBy(asc(suggestions.createdAt));
}

export async function listReportedIncidents(
  db: Database,
  userId: string,
): Promise<
  Array<{
    communityId: string;
    communityName: string;
    title: string;
    description: string;
    status: string;
    createdAt: Date;
  }>
> {
  return db
    .select({
      communityId: communities.id,
      communityName: communities.name,
      title: incidents.title,
      description: incidents.description,
      status: incidents.status,
      createdAt: incidents.createdAt,
    })
    .from(incidents)
    .innerJoin(communities, eq(incidents.communityId, communities.id))
    .where(eq(incidents.reportedById, userId))
    .orderBy(asc(incidents.createdAt));
}

export async function listAssignedTasks(
  db: Database,
  userId: string,
): Promise<
  Array<{
    communityId: string;
    communityName: string;
    title: string;
    status: string;
    dueOn: string | null;
    createdAt: Date;
  }>
> {
  return db
    .select({
      communityId: communities.id,
      communityName: communities.name,
      title: tasks.title,
      status: tasks.status,
      dueOn: tasks.dueOn,
      createdAt: tasks.createdAt,
    })
    .from(tasks)
    .innerJoin(communities, eq(tasks.communityId, communities.id))
    .where(eq(tasks.assigneeId, userId))
    .orderBy(asc(tasks.createdAt));
}

export async function listUserPollVotes(
  db: Database,
  userId: string,
): Promise<
  Array<{
    communityId: string;
    communityName: string;
    question: string;
    option: string;
    votedAt: Date;
  }>
> {
  return db
    .select({
      communityId: communities.id,
      communityName: communities.name,
      question: polls.question,
      option: pollOptions.text,
      votedAt: pollVotes.createdAt,
    })
    .from(pollVotes)
    .innerJoin(polls, eq(pollVotes.pollId, polls.id))
    .innerJoin(pollOptions, eq(pollVotes.optionId, pollOptions.id))
    .innerJoin(communities, eq(pollVotes.communityId, communities.id))
    .where(eq(pollVotes.userId, userId))
    .orderBy(asc(pollVotes.createdAt));
}

export async function listUploadedDocuments(
  db: Database,
  userId: string,
): Promise<
  Array<{
    communityId: string;
    communityName: string;
    title: string;
    category: string;
    sizeBytes: number;
    createdAt: Date;
  }>
> {
  return db
    .select({
      communityId: communities.id,
      communityName: communities.name,
      title: documents.title,
      category: documents.category,
      sizeBytes: documents.sizeBytes,
      createdAt: documents.createdAt,
    })
    .from(documents)
    .innerJoin(communities, eq(documents.communityId, communities.id))
    .where(eq(documents.uploadedById, userId))
    .orderBy(asc(documents.createdAt));
}

export async function listActorEvents(
  db: Database,
  userId: string,
): Promise<Array<{ communityId: string; action: string; createdAt: Date }>> {
  return db
    .select({
      communityId: auditEvents.communityId,
      action: auditEvents.action,
      createdAt: auditEvents.createdAt,
    })
    .from(auditEvents)
    .where(eq(auditEvents.actorId, userId))
    .orderBy(asc(auditEvents.createdAt));
}

export interface MembershipRow {
  communityId: string;
  communityName: string;
  role: string;
}

/** Membresías activas de la persona, para planificar la baja. */
export async function listMemberships(
  db: Database,
  userId: string,
): Promise<MembershipRow[]> {
  return db
    .select({
      communityId: communityMemberships.communityId,
      communityName: communities.name,
      role: communityMemberships.role,
    })
    .from(communityMemberships)
    .innerJoin(communities, eq(communityMemberships.communityId, communities.id))
    .where(eq(communityMemberships.userId, userId));
}

export interface CommunityTally {
  communityId: string;
  total: number;
  owners: number;
}

/** Nº total de miembros y de propietarios de cada comunidad. */
export async function countCommunityMembers(
  db: Database,
  communityIds: string[],
): Promise<CommunityTally[]> {
  if (communityIds.length === 0) return [];
  return db
    .select({
      communityId: communityMemberships.communityId,
      total: sql<number>`count(*)::int`,
      owners: sql<number>`(count(*) filter (where ${communityMemberships.role} = 'owner'))::int`,
    })
    .from(communityMemberships)
    .where(inArray(communityMemberships.communityId, communityIds))
    .groupBy(communityMemberships.communityId);
}

/** Claves privadas de los archivos de unas comunidades (para borrarlos). */
export async function listStorageKeys(
  db: Database,
  communityIds: string[],
): Promise<string[]> {
  if (communityIds.length === 0) return [];
  const documentKeys = await db
    .select({ key: documents.storageKey })
    .from(documents)
    .where(inArray(documents.communityId, communityIds));
  const photoKeys = await db
    .select({ key: incidentPhotos.storageKey })
    .from(incidentPhotos)
    .innerJoin(incidents, eq(incidentPhotos.incidentId, incidents.id))
    .where(inArray(incidents.communityId, communityIds));
  return [...documentKeys, ...photoKeys].map((row) => row.key);
}

export async function deleteCommunities(
  db: Database,
  communityIds: string[],
): Promise<void> {
  if (communityIds.length === 0) return;
  await db.delete(communities).where(inArray(communities.id, communityIds));
}

export async function deleteUserById(db: Database, userId: string): Promise<void> {
  await db.delete(user).where(eq(user.id, userId));
}
