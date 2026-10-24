import { and, asc, count, eq } from 'drizzle-orm';
import type { CommunityRole } from '@comunidad/shared';
import type { Database } from '../../db/client';
import { communities, communityMemberships, user } from '../../db/schema';
import type { Membership } from '../../db/schema';
import { newId } from '../../lib/ids';

export interface CommunityOfUserRow {
  id: string;
  name: string;
  address: string | null;
  role: CommunityRole;
  createdAt: Date;
}

export interface MemberRow {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: CommunityRole;
  createdAt: Date;
}

/** Comunidades a las que pertenece el usuario, con su rol en cada una. */
export async function listCommunitiesOfUser(
  db: Database,
  userId: string,
): Promise<CommunityOfUserRow[]> {
  return db
    .select({
      id: communities.id,
      name: communities.name,
      address: communities.address,
      role: communityMemberships.role,
      createdAt: communities.createdAt,
    })
    .from(communityMemberships)
    .innerJoin(communities, eq(communityMemberships.communityId, communities.id))
    .where(eq(communityMemberships.userId, userId))
    .orderBy(asc(communities.createdAt));
}

/** Membresía del usuario en una comunidad concreta, si existe. */ export async function findMembership(
  db: Database,
  userId: string,
  communityId: string,
): Promise<Membership | null> {
  const [membership] = await db
    .select()
    .from(communityMemberships)
    .where(
      and(
        eq(communityMemberships.userId, userId),
        eq(communityMemberships.communityId, communityId),
      ),
    )
    .limit(1);
  return membership ?? null;
}

/** Comunidad vista desde la membresía del usuario (incluye su rol). */
export async function findCommunityOfUser(
  db: Database,
  userId: string,
  communityId: string,
): Promise<CommunityOfUserRow | null> {
  const [row] = await db
    .select({
      id: communities.id,
      name: communities.name,
      address: communities.address,
      role: communityMemberships.role,
      createdAt: communities.createdAt,
    })
    .from(communityMemberships)
    .innerJoin(communities, eq(communityMemberships.communityId, communities.id))
    .where(
      and(
        eq(communityMemberships.userId, userId),
        eq(communityMemberships.communityId, communityId),
      ),
    )
    .limit(1);
  return row ?? null;
}

/** Crea la comunidad y la membresía de su presidente en una transacción. */
export async function createCommunityWithOwner(
  db: Database,
  input: { name: string; address: string | null; userId: string },
): Promise<{ id: string; name: string; address: string | null; createdAt: Date }> {
  return db.transaction(async (tx) => {
    const [community] = await tx
      .insert(communities)
      .values({
        id: newId('cm'),
        name: input.name,
        address: input.address,
      })
      .returning();
    if (!community) {
      throw new Error('No se pudo crear la comunidad');
    }

    await tx.insert(communityMemberships).values({
      id: newId('mem'),
      communityId: community.id,
      userId: input.userId,
      role: 'owner',
    });

    return {
      id: community.id,
      name: community.name,
      address: community.address,
      createdAt: community.createdAt,
    };
  });
}

/** Miembros de una comunidad con sus datos de cuenta. */
export async function listMembers(
  db: Database,
  communityId: string,
): Promise<MemberRow[]> {
  return db
    .select({
      id: communityMemberships.id,
      userId: user.id,
      name: user.name,
      email: user.email,
      role: communityMemberships.role,
      createdAt: communityMemberships.createdAt,
    })
    .from(communityMemberships)
    .innerJoin(user, eq(communityMemberships.userId, user.id))
    .where(eq(communityMemberships.communityId, communityId))
    .orderBy(asc(communityMemberships.createdAt));
}

/** Miembro concreto de una comunidad (nunca busca sin `communityId`). */
export async function findMemberById(
  db: Database,
  communityId: string,
  memberId: string,
): Promise<MemberRow | null> {
  const [member] = await db
    .select({
      id: communityMemberships.id,
      userId: user.id,
      name: user.name,
      email: user.email,
      role: communityMemberships.role,
      createdAt: communityMemberships.createdAt,
    })
    .from(communityMemberships)
    .innerJoin(user, eq(communityMemberships.userId, user.id))
    .where(
      and(
        eq(communityMemberships.communityId, communityId),
        eq(communityMemberships.id, memberId),
      ),
    )
    .limit(1);
  return member ?? null;
}

/** Inserta una membresía (uso: aceptación de invitaciones). */
export async function insertMembership(
  db: Database,
  input: { communityId: string; userId: string; role: CommunityRole },
): Promise<Membership> {
  const [membership] = await db
    .insert(communityMemberships)
    .values({
      id: newId('mem'),
      communityId: input.communityId,
      userId: input.userId,
      role: input.role,
    })
    .returning();
  if (!membership) {
    throw new Error('No se pudo crear la membresía');
  }
  return membership;
}

export async function updateMemberRole(
  db: Database,
  memberId: string,
  role: CommunityRole,
): Promise<void> {
  await db
    .update(communityMemberships)
    .set({ role, updatedAt: new Date() })
    .where(eq(communityMemberships.id, memberId));
}

export async function deleteMember(db: Database, memberId: string): Promise<void> {
  await db.delete(communityMemberships).where(eq(communityMemberships.id, memberId));
}

export async function countOwners(db: Database, communityId: string): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(communityMemberships)
    .where(
      and(
        eq(communityMemberships.communityId, communityId),
        eq(communityMemberships.role, 'owner'),
      ),
    );
  return row?.value ?? 0;
}
