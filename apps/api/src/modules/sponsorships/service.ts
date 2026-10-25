import type { CreateSponsorshipInput, UpdateSponsorshipInput } from '@comunidad/shared';
import { recordAuditEvent } from '../../lib/audit';
import type { Database } from '../../db/client';
import { notFound, validationError } from '../../lib/errors';
import * as repo from './repository';
import type { SponsorshipRow } from './repository';

export interface Actor {
  id: string;
}

async function assertCommunitiesExist(
  db: Database,
  communityIds: string[],
): Promise<void> {
  const existing = await repo.countExistingCommunities(db, communityIds);
  if (existing !== communityIds.length) {
    throw validationError('Alguna comunidad indicada no existe');
  }
}

/** Deja constancia en las comunidades afectadas (visibilidad vecinal). */
async function auditAssignedCommunities(
  db: Database,
  actor: Actor,
  communityIds: string[],
  action: string,
  sponsorshipId: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  for (const communityId of communityIds) {
    await recordAuditEvent(db, {
      communityId,
      actorId: actor.id,
      action,
      targetType: 'sponsorship',
      targetId: sponsorshipId,
      metadata,
    });
  }
}

export async function addSponsorship(
  db: Database,
  actor: Actor,
  input: CreateSponsorshipInput,
): Promise<SponsorshipRow> {
  await assertCommunitiesExist(db, input.communityIds);

  const sponsorship = await repo.createSponsorship(db, {
    businessName: input.businessName,
    website: input.website || null,
    contactEmail: input.contactEmail || null,
    monthlyAmount: input.monthlyAmount || null,
    notes: input.notes ?? null,
    createdById: actor.id,
    communityIds: input.communityIds,
  });

  await auditAssignedCommunities(
    db,
    actor,
    sponsorship.communityIds,
    'sponsorship.created',
    sponsorship.id,
    { businessName: sponsorship.businessName, status: sponsorship.status },
  );

  return sponsorship;
}

export async function editSponsorship(
  db: Database,
  actor: Actor,
  sponsorshipId: string,
  input: UpdateSponsorshipInput,
): Promise<void> {
  const existing = await repo.findSponsorship(db, sponsorshipId);
  if (!existing) {
    throw notFound('Patrocinio no encontrado');
  }
  if (input.communityIds) {
    await assertCommunitiesExist(db, input.communityIds);
  }

  const values: {
    businessName?: string;
    website?: string | null;
    contactEmail?: string | null;
    monthlyAmount?: string | null;
    notes?: string | null;
    status?: SponsorshipRow['status'];
  } = {};
  if (input.businessName !== undefined) values.businessName = input.businessName;
  if (input.website !== undefined) values.website = input.website || null;
  if (input.contactEmail !== undefined) {
    values.contactEmail = input.contactEmail || null;
  }
  if (input.monthlyAmount !== undefined) {
    values.monthlyAmount = input.monthlyAmount || null;
  }
  if (input.notes !== undefined) values.notes = input.notes;
  if (input.status !== undefined) values.status = input.status;

  const nextCommunities = input.communityIds ?? existing.communityIds;
  await repo.updateSponsorship(db, sponsorshipId, values, input.communityIds);

  // Visibilidad en las comunidades de antes y después del cambio.
  const affected = [...new Set([...existing.communityIds, ...nextCommunities])];
  await auditAssignedCommunities(
    db,
    actor,
    affected,
    'sponsorship.updated',
    sponsorshipId,
    {
      businessName: input.businessName ?? existing.businessName,
      status: input.status ?? existing.status,
      communities: nextCommunities.length,
    },
  );
}

export async function removeSponsorship(
  db: Database,
  actor: Actor,
  sponsorshipId: string,
): Promise<void> {
  const existing = await repo.findSponsorship(db, sponsorshipId);
  if (!existing) {
    throw notFound('Patrocinio no encontrado');
  }

  await repo.deleteSponsorship(db, sponsorshipId);
  await auditAssignedCommunities(
    db,
    actor,
    existing.communityIds,
    'sponsorship.deleted',
    sponsorshipId,
    { businessName: existing.businessName },
  );
}
