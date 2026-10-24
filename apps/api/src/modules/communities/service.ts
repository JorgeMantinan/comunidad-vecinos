import { canManageRole } from '@comunidad/shared';
import type { CommunityRole, CreateCommunityInput } from '@comunidad/shared';
import { recordAuditEvent } from '../../lib/audit';
import type { Database } from '../../db/client';
import { conflict, forbidden, notFound } from '../../lib/errors';
import {
  countOwners,
  createCommunityWithOwner,
  deleteMember,
  findMemberById,
  updateMemberRole,
} from './repository';

export interface Actor {
  id: string;
}

export interface CommunityCreated {
  id: string;
  name: string;
  address: string | null;
  role: 'owner';
  createdAt: Date;
}

/** Crea una comunidad. Quien la crea queda registrado como presidente. */
export async function createCommunity(
  db: Database,
  actor: Actor,
  input: CreateCommunityInput,
): Promise<CommunityCreated> {
  const community = await createCommunityWithOwner(db, {
    name: input.name,
    address: input.address ?? null,
    userId: actor.id,
  });

  await recordAuditEvent(db, {
    communityId: community.id,
    actorId: actor.id,
    action: 'community.created',
    targetType: 'community',
    targetId: community.id,
    metadata: { name: community.name },
  });

  return { ...community, role: 'owner' as const };
}

/**
 * Cambia el rol de un miembro respetando la matriz de permisos:
 * el `owner` gestiona a todos; `admin` solo a `member` y `resident`;
 * solo el `owner` nombra nuevos `owner` y no puede quedarse sin ellos.
 */
export async function changeMemberRole(
  db: Database,
  actor: Actor,
  actorRole: CommunityRole,
  communityId: string,
  memberId: string,
  newRole: CommunityRole,
): Promise<void> {
  const target = await findMemberById(db, communityId, memberId);
  if (!target) {
    throw notFound('Miembro no encontrado');
  }
  if (!canManageRole(actorRole, target.role)) {
    throw forbidden('No puedes modificar a un miembro con ese rol');
  }
  if (newRole === 'owner' && actorRole !== 'owner') {
    throw forbidden('Solo el presidente puede nombrar a otro presidente');
  }
  if (
    target.role === 'owner' &&
    newRole !== 'owner' &&
    (await countOwners(db, communityId)) <= 1
  ) {
    throw conflict('La comunidad debe mantener al menos un presidente');
  }

  await updateMemberRole(db, memberId, newRole);
  await recordAuditEvent(db, {
    communityId,
    actorId: actor.id,
    action: 'member.role_changed',
    targetType: 'membership',
    targetId: memberId,
    metadata: { from: target.role, to: newRole, userId: target.userId },
  });
}

/** Elimina un miembro con los mismos límites de gestión por rol. */
export async function removeMember(
  db: Database,
  actor: Actor,
  actorRole: CommunityRole,
  communityId: string,
  memberId: string,
): Promise<void> {
  const target = await findMemberById(db, communityId, memberId);
  if (!target) {
    throw notFound('Miembro no encontrado');
  }
  if (!canManageRole(actorRole, target.role)) {
    throw forbidden('No puedes eliminar a un miembro con ese rol');
  }
  if (target.role === 'owner' && (await countOwners(db, communityId)) <= 1) {
    throw conflict('La comunidad debe mantener al menos un presidente');
  }

  await deleteMember(db, memberId);
  await recordAuditEvent(db, {
    communityId,
    actorId: actor.id,
    action: 'member.removed',
    targetType: 'membership',
    targetId: memberId,
    metadata: { userId: target.userId, role: target.role },
  });
}
