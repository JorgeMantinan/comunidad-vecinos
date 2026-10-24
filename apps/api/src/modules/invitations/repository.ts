import { and, asc, desc, eq, isNull, sql } from 'drizzle-orm';
import type { InvitableRole } from '@comunidad/shared';
import type { Database } from '../../db/client';
import { communities, invitations, user } from '../../db/schema';
import { newId } from '../../lib/ids';

export interface InvitationRow {
  id: string;
  communityId: string;
  email: string;
  role: InvitableRole;
  expiresAt: Date;
  acceptedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}

export interface PendingInvitationRow extends InvitationRow {
  communityName: string;
  communityAddress: string | null;
  invitedByName: string;
}

interface InvitationValues {
  communityId: string;
  email: string;
  role: InvitableRole;
  tokenHash: string;
  invitedById: string;
  expiresAt: Date;
}

const invitationColumns = {
  id: invitations.id,
  communityId: invitations.communityId,
  email: invitations.email,
  role: invitations.role,
  expiresAt: invitations.expiresAt,
  acceptedAt: invitations.acceptedAt,
  revokedAt: invitations.revokedAt,
  createdAt: invitations.createdAt,
} as const;

const pendingCondition = and(
  isNull(invitations.acceptedAt),
  isNull(invitations.revokedAt),
  sql`${invitations.expiresAt} > now()`,
);

export async function insertInvitation(
  db: Database,
  values: InvitationValues,
): Promise<InvitationRow> {
  const [row] = await db
    .insert(invitations)
    .values({ id: newId('inv'), ...values })
    .returning(invitationColumns);
  if (!row) {
    throw new Error('No se pudo crear la invitación');
  }
  return row;
}

/** Invitaciones de una comunidad, de la más reciente a la más antigua. */
export async function listInvitations(
  db: Database,
  communityId: string,
): Promise<InvitationRow[]> {
  return db
    .select(invitationColumns)
    .from(invitations)
    .where(eq(invitations.communityId, communityId))
    .orderBy(desc(invitations.createdAt));
}

export async function findInvitationById(
  db: Database,
  communityId: string,
  invitationId: string,
): Promise<InvitationRow | null> {
  const [row] = await db
    .select(invitationColumns)
    .from(invitations)
    .where(
      and(eq(invitations.communityId, communityId), eq(invitations.id, invitationId)),
    )
    .limit(1);
  return row ?? null;
}

export async function revokeInvitation(
  db: Database,
  invitationId: string,
): Promise<void> {
  await db
    .update(invitations)
    .set({ revokedAt: new Date() })
    .where(eq(invitations.id, invitationId));
}

/** Invitación pendiente previa para el mismo email de una comunidad. */
export async function findPendingInvitationByEmail(
  db: Database,
  communityId: string,
  email: string,
): Promise<InvitationRow | null> {
  const [row] = await db
    .select(invitationColumns)
    .from(invitations)
    .where(
      and(
        eq(invitations.communityId, communityId),
        eq(invitations.email, email),
        pendingCondition,
      ),
    )
    .limit(1);
  return row ?? null;
}

/** Busca una invitación por el hash de su token (nunca por el token). */
export async function findInvitationByTokenHash(
  db: Database,
  tokenHash: string,
): Promise<InvitationRow | null> {
  const [row] = await db
    .select(invitationColumns)
    .from(invitations)
    .where(eq(invitations.tokenHash, tokenHash))
    .limit(1);
  return row ?? null;
}

export async function markInvitationAccepted(
  db: Database,
  invitationId: string,
  userId: string,
): Promise<void> {
  await db
    .update(invitations)
    .set({ acceptedAt: new Date(), acceptedBy: userId })
    .where(eq(invitations.id, invitationId));
}

/** Invitaciones pendientes dirigidas a un email, con datos de comunidad. */
export async function listPendingInvitationsForEmail(
  db: Database,
  email: string,
): Promise<PendingInvitationRow[]> {
  return db
    .select({
      ...invitationColumns,
      communityName: communities.name,
      communityAddress: communities.address,
      invitedByName: user.name,
    })
    .from(invitations)
    .innerJoin(communities, eq(invitations.communityId, communities.id))
    .innerJoin(user, eq(invitations.invitedById, user.id))
    .where(and(eq(invitations.email, email), pendingCondition))
    .orderBy(asc(invitations.createdAt));
}
