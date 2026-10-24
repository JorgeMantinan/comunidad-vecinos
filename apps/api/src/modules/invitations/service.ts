import { createHash, randomBytes } from 'node:crypto';
import type {
  AcceptInvitationInput,
  CreateInvitationInput,
  Invitation,
} from '@comunidad/shared';
import { recordAuditEvent } from '../../lib/audit';
import type { Database } from '../../db/client';
import { conflict, forbidden, notFound } from '../../lib/errors';
import {
  findCommunityOfUser,
  findMembership,
  insertMembership,
} from '../communities/repository';
import * as repo from './repository';
import type { InvitationRow } from './repository';

/** Caducidad de las invitaciones: 7 días. */
const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface CreatedInvitation {
  invitation: Invitation;
  /** Token en claro. Solo se entrega una vez; en el futuro llegará por correo. */
  token: string;
}

export interface AcceptedInvitation {
  communityId: string;
  communityName: string;
  role: Invitation['role'];
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function invitationStatus(
  row: Pick<InvitationRow, 'acceptedAt' | 'revokedAt' | 'expiresAt'>,
  now = new Date(),
): Invitation['status'] {
  if (row.revokedAt) return 'revoked';
  if (row.acceptedAt) return 'accepted';
  if (row.expiresAt <= now) return 'expired';
  return 'pending';
}

export function toInvitation(row: InvitationRow): Invitation {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    status: invitationStatus(row),
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
  };
}

/** Crea una invitación de uso único con caducidad. */
export async function createInvitation(
  db: Database,
  actor: { id: string },
  communityId: string,
  input: CreateInvitationInput,
): Promise<CreatedInvitation> {
  const existing = await repo.findPendingInvitationByEmail(
    db,
    communityId,
    input.email,
  );
  if (existing) {
    throw conflict('Ya existe una invitación pendiente para este email');
  }

  const token = randomBytes(32).toString('hex');
  const row = await repo.insertInvitation(db, {
    communityId,
    email: input.email,
    role: input.role,
    tokenHash: hashToken(token),
    invitedById: actor.id,
    expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
  });

  await recordAuditEvent(db, {
    communityId,
    actorId: actor.id,
    action: 'invitation.created',
    targetType: 'invitation',
    targetId: row.id,
    metadata: { email: row.email, role: row.role },
  });

  return { invitation: toInvitation(row), token };
}

/** Revoca una invitación pendiente (idempotente). */
export async function revokeInvitation(
  db: Database,
  actor: { id: string },
  communityId: string,
  invitationId: string,
): Promise<void> {
  const row = await repo.findInvitationById(db, communityId, invitationId);
  if (!row) {
    throw notFound('Invitación no encontrada');
  }
  if (row.acceptedAt) {
    throw conflict('La invitación ya fue aceptada');
  }
  if (row.revokedAt) {
    return;
  }

  await repo.revokeInvitation(db, invitationId);
  await recordAuditEvent(db, {
    communityId,
    actorId: actor.id,
    action: 'invitation.revoked',
    targetType: 'invitation',
    targetId: invitationId,
    metadata: { email: row.email },
  });
}

/**
 * Acepta una invitación con su token. Valida caducidad, revocación,
 * uso único y que el email del invitado coincida con el invitado.
 */
export async function acceptInvitation(
  db: Database,
  user: { id: string; email: string },
  input: AcceptInvitationInput,
): Promise<AcceptedInvitation> {
  const row = await repo.findInvitationByTokenHash(db, hashToken(input.token));
  if (!row) {
    throw notFound('Invitación no encontrada');
  }
  if (row.revokedAt) {
    throw forbidden('La invitación ha sido revocada');
  }
  if (row.acceptedAt) {
    throw conflict('La invitación ya fue utilizada');
  }
  if (row.expiresAt <= new Date()) {
    throw conflict('La invitación ha caducado');
  }
  if (row.email.toLowerCase() !== user.email.toLowerCase()) {
    throw forbidden('La invitación no corresponde a este email');
  }

  const existingMembership = await findMembership(db, user.id, row.communityId);
  if (existingMembership) {
    throw conflict('Ya formas parte de esta comunidad');
  }

  await insertMembership(db, {
    communityId: row.communityId,
    userId: user.id,
    role: row.role,
  });
  await repo.markInvitationAccepted(db, row.id, user.id);

  await recordAuditEvent(db, {
    communityId: row.communityId,
    actorId: user.id,
    action: 'invitation.accepted',
    targetType: 'invitation',
    targetId: row.id,
    metadata: { email: row.email, role: row.role },
  });

  const community = await findCommunityOfUser(db, user.id, row.communityId);

  return {
    communityId: row.communityId,
    communityName: community?.name ?? '',
    role: row.role,
  };
}
