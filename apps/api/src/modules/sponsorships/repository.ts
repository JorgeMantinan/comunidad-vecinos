import { asc, eq, inArray, sql } from 'drizzle-orm';
import type { SponsorshipStatus } from '@comunidad/shared';
import type { Database } from '../../db/client';
import { communities, sponsorshipCommunities, sponsorships } from '../../db/schema';
import { newId } from '../../lib/ids';
import { zoneMatches } from './zone';

export interface SponsorshipRow {
  id: string;
  businessName: string;
  website: string | null;
  contactEmail: string | null;
  zone: string | null;
  monthlyAmount: string | null;
  status: SponsorshipStatus;
  notes: string | null;
  communityIds: string[];
  createdAt: Date;
}

const baseColumns = {
  id: sponsorships.id,
  businessName: sponsorships.businessName,
  website: sponsorships.website,
  contactEmail: sponsorships.contactEmail,
  zone: sponsorships.zone,
  monthlyAmount: sponsorships.monthlyAmount,
  status: sponsorships.status,
  notes: sponsorships.notes,
  createdAt: sponsorships.createdAt,
} as const;

async function attachCommunities(
  db: Database,
  rows: Array<Omit<SponsorshipRow, 'communityIds'>>,
): Promise<SponsorshipRow[]> {
  if (rows.length === 0) {
    return [];
  }
  const assignments = await db
    .select({
      sponsorshipId: sponsorshipCommunities.sponsorshipId,
      communityId: sponsorshipCommunities.communityId,
    })
    .from(sponsorshipCommunities)
    .where(
      inArray(
        sponsorshipCommunities.sponsorshipId,
        rows.map((row) => row.id),
      ),
    );

  const bySponsorship = new Map<string, string[]>();
  for (const assignment of assignments) {
    const list = bySponsorship.get(assignment.sponsorshipId) ?? [];
    list.push(assignment.communityId);
    bySponsorship.set(assignment.sponsorshipId, list);
  }

  return rows.map((row) => ({
    ...row,
    communityIds: bySponsorship.get(row.id) ?? [],
  }));
}

export async function listSponsorships(db: Database): Promise<SponsorshipRow[]> {
  const rows = await db
    .select(baseColumns)
    .from(sponsorships)
    .orderBy(asc(sponsorships.businessName));
  return attachCommunities(db, rows);
}

export async function findSponsorship(
  db: Database,
  sponsorshipId: string,
): Promise<SponsorshipRow | null> {
  const [row] = await db
    .select(baseColumns)
    .from(sponsorships)
    .where(eq(sponsorships.id, sponsorshipId))
    .limit(1);
  if (!row) {
    return null;
  }
  const [full] = await attachCommunities(db, [row]);
  return full ?? null;
}

export async function createSponsorship(
  db: Database,
  values: {
    businessName: string;
    website: string | null;
    contactEmail: string | null;
    zone: string | null;
    monthlyAmount: string | null;
    notes: string | null;
    createdById: string;
    communityIds: string[];
  },
): Promise<SponsorshipRow> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(sponsorships)
      .values({
        id: newId('sps'),
        businessName: values.businessName,
        website: values.website,
        contactEmail: values.contactEmail,
        zone: values.zone,
        monthlyAmount: values.monthlyAmount,
        notes: values.notes,
        createdById: values.createdById,
        status: 'pending',
      })
      .returning(baseColumns);
    if (!row) {
      throw new Error('No se pudo crear el patrocinio');
    }
    await tx.insert(sponsorshipCommunities).values(
      values.communityIds.map((communityId) => ({
        sponsorshipId: row.id,
        communityId,
      })),
    );
    return { ...row, communityIds: values.communityIds };
  });
}

export async function updateSponsorship(
  db: Database,
  sponsorshipId: string,
  values: {
    businessName?: string;
    website?: string | null;
    contactEmail?: string | null;
    zone?: string | null;
    monthlyAmount?: string | null;
    notes?: string | null;
    status?: SponsorshipStatus;
  },
  communityIds?: string[],
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .update(sponsorships)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(sponsorships.id, sponsorshipId));

    if (communityIds) {
      await tx
        .delete(sponsorshipCommunities)
        .where(eq(sponsorshipCommunities.sponsorshipId, sponsorshipId));
      if (communityIds.length > 0) {
        await tx.insert(sponsorshipCommunities).values(
          communityIds.map((communityId) => ({
            sponsorshipId,
            communityId,
          })),
        );
      }
    }
  });
}

export async function deleteSponsorship(
  db: Database,
  sponsorshipId: string,
): Promise<void> {
  await db.delete(sponsorships).where(eq(sponsorships.id, sponsorshipId));
}

/**
 * Publicidad visible en una comunidad (vista pública): la asignada a
 * mano por la plataforma **más** la que coincide con la zona de la finca.
 */
export async function listCommunitySponsorships(
  db: Database,
  communityId: string,
): Promise<Array<{ id: string; businessName: string; website: string | null }>> {
  const [community] = await db
    .select({ address: communities.address })
    .from(communities)
    .where(eq(communities.id, communityId))
    .limit(1);

  const active = await db
    .select({
      id: sponsorships.id,
      businessName: sponsorships.businessName,
      website: sponsorships.website,
      zone: sponsorships.zone,
    })
    .from(sponsorships)
    .where(eq(sponsorships.status, 'active'))
    .orderBy(asc(sponsorships.businessName));

  const assignments = await db
    .select({ sponsorshipId: sponsorshipCommunities.sponsorshipId })
    .from(sponsorshipCommunities)
    .where(eq(sponsorshipCommunities.communityId, communityId));
  const assigned = new Set(assignments.map((row) => row.sponsorshipId));

  return active
    .filter((row) => assigned.has(row.id) || zoneMatches(row.zone, community?.address))
    .map(({ id, businessName, website }) => ({ id, businessName, website }));
}

/** Cuenta comunidades existentes de una lista (validación de entrada). */
export async function countExistingCommunities(
  db: Database,
  communityIds: string[],
): Promise<number> {
  if (communityIds.length === 0) {
    return 0;
  }
  const [row] = await db
    .select({ value: sql<number>`count(*)` })
    .from(communities)
    .where(inArray(communities.id, communityIds));
  return Number(row?.value ?? 0);
}
