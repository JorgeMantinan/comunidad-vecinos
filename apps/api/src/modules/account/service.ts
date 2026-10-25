import { verifyPassword } from 'better-auth/crypto';
import type { DeleteAccountResult, PersonalExport } from '@comunidad/shared';
import { and, eq } from 'drizzle-orm';
import type { Database } from '../../db/client';
import { account, auditEvents } from '../../db/schema';
import { conflict, notFound } from '../../lib/errors';
import { toIso } from '../../lib/http';
import { newId } from '../../lib/ids';
import type { StoragePort } from '../../lib/storage';
import {
  countCommunityMembers,
  deleteCommunities,
  deleteUserById,
  findProfile,
  listActorEvents,
  listAssignedTasks,
  listAuthoredAnnouncements,
  listAuthoredSuggestions,
  listInvitationsSent,
  listMemberships,
  listOwnedUnits,
  listReportedIncidents,
  listStorageKeys,
  listUploadedDocuments,
  listUserCommunities,
  listUserPollVotes,
} from './repository';

/**
 * Verifica la contraseña del propio usuario contra el hash de Better Auth.
 * Solo sirve para operaciones sobre la cuenta de quien autentica.
 */
export async function verifyAccountPassword(
  db: Database,
  userId: string,
  password: string,
): Promise<boolean> {
  const [row] = await db
    .select({ password: account.password })
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, 'credential')))
    .limit(1);
  if (!row?.password) {
    return false;
  }
  return verifyPassword({ hash: row.password, password });
}

/**
 * Baja de la cuenta.
 *
 * Reglas (decisión de producto, probadas en `account.test.ts`):
 * -  Si la persona es la **única propietaria** de una comunidad con
 *    otros miembros, se bloquea (409): antes hay que transferir la
 *    presidencia para no dejar la comunidad huérfana.
 * -  Las comunidades en las que es el **único miembro** se eliminan con
 *    la cuenta (incluidos sus archivos privados).
 * -  El resto de comunidades siguen existiendo: solo desaparece su
 *    membresía. Los registros económicos y las actas se conservan y
 *    quedan con el actor anonimizado (FK con `set null`).
 */
export async function deleteAccountData(
  db: Database,
  storage: StoragePort,
  userId: string,
): Promise<DeleteAccountResult> {
  const memberships = await listMemberships(db, userId);
  const communityIds = memberships.map((row) => row.communityId);
  const tallies = await countCommunityMembers(db, communityIds);
  const tallyById = new Map(tallies.map((row) => [row.communityId, row]));

  const blocking = memberships.find((row) => {
    const tally = tallyById.get(row.communityId);
    return (
      row.role === 'owner' &&
      tally !== undefined &&
      tally.total > 1 &&
      tally.owners === 1
    );
  });
  if (blocking) {
    throw conflict(
      `No puedes darte de baja mientras seas la única persona propietaria de "${blocking.communityName}". Transfiere la presidencia antes.`,
    );
  }

  const ownCommunities = memberships
    .filter((row) => (tallyById.get(row.communityId)?.total ?? 0) === 1)
    .map((row) => row.communityId);

  // Trazas de salida en las comunidades que siguen vivas; el actor queda
  // anónimo en cuanto se borra la cuenta (FK con `set null`).
  for (const row of memberships) {
    if (ownCommunities.includes(row.communityId)) continue;
    await db.insert(auditEvents).values({
      id: newId('ae'),
      communityId: row.communityId,
      actorId: userId,
      action: 'member.removed',
      metadata: { reason: 'account_deleted' },
    });
  }

  if (ownCommunities.length > 0) {
    const keys = await listStorageKeys(db, ownCommunities);
    for (const key of keys) {
      try {
        await storage.delete(key);
      } catch (error: unknown) {
        console.warn('[cuenta] no se pudo borrar el archivo', key, error);
      }
    }
    await deleteCommunities(db, ownCommunities);
  }

  await deleteUserById(db, userId);
  return {
    deleted: true,
    removedMemberships: memberships.length,
    deletedCommunities: ownCommunities.length,
  };
}

/**
 * Exportación personal (derecho de acceso y portabilidad): solo datos
 * de la persona que pide la descarga.
 */
export async function buildPersonalExport(
  db: Database,
  userId: string,
): Promise<PersonalExport> {
  const profile = await findProfile(db, userId);
  if (!profile) {
    throw notFound('Cuenta no encontrada');
  }

  const [
    communityRows,
    unitRows,
    invitationRows,
    announcementRows,
    suggestionRows,
    incidentRows,
    taskRows,
    voteRows,
    documentRows,
    eventRows,
  ] = await Promise.all([
    listUserCommunities(db, userId),
    listOwnedUnits(db, userId),
    listInvitationsSent(db, userId),
    listAuthoredAnnouncements(db, userId),
    listAuthoredSuggestions(db, userId),
    listReportedIncidents(db, userId),
    listAssignedTasks(db, userId),
    listUserPollVotes(db, userId),
    listUploadedDocuments(db, userId),
    listActorEvents(db, userId),
  ]);

  return {
    format: 'comunidad-vecinos/export-personal-v1',
    exportedAt: toIso(new Date()),
    profile: {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      emailVerified: profile.emailVerified,
      createdAt: toIso(profile.createdAt),
    },
    communities: communityRows.map((row) => ({
      ...row,
      joinedAt: toIso(row.joinedAt),
    })),
    ownedUnits: unitRows,
    invitationsSent: invitationRows.map((row) => ({
      ...row,
      createdAt: toIso(row.createdAt),
      expiresAt: toIso(row.expiresAt),
      acceptedAt: row.acceptedAt ? toIso(row.acceptedAt) : null,
      revokedAt: row.revokedAt ? toIso(row.revokedAt) : null,
    })),
    announcements: announcementRows.map((row) => ({
      ...row,
      publishedAt: toIso(row.publishedAt),
    })),
    suggestions: suggestionRows.map((row) => ({
      ...row,
      createdAt: toIso(row.createdAt),
    })),
    incidents: incidentRows.map((row) => ({
      ...row,
      createdAt: toIso(row.createdAt),
    })),
    assignedTasks: taskRows.map((row) => ({
      ...row,
      createdAt: toIso(row.createdAt),
    })),
    pollVotes: voteRows.map((row) => ({
      ...row,
      votedAt: toIso(row.votedAt),
    })),
    uploadedDocuments: documentRows.map((row) => ({
      ...row,
      createdAt: toIso(row.createdAt),
    })),
    auditEvents: eventRows.map((row) => ({
      ...row,
      createdAt: toIso(row.createdAt),
    })),
  };
}
