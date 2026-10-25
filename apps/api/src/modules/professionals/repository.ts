import { and, asc, eq } from 'drizzle-orm';
import type { Database } from '../../db/client';
import { professionals, user } from '../../db/schema';
import { newId } from '../../lib/ids';

export interface ProfessionalRow {
  id: string;
  communityId: string;
  name: string;
  trade: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  recommendedByName: string | null;
  createdAt: Date;
}

const columns = {
  id: professionals.id,
  communityId: professionals.communityId,
  name: professionals.name,
  trade: professionals.trade,
  phone: professionals.phone,
  email: professionals.email,
  notes: professionals.notes,
  recommendedByName: user.name,
  createdAt: professionals.createdAt,
} as const;

/** Profesionales recomendados, ordenados por oficio y nombre. */
export async function listProfessionals(
  db: Database,
  communityId: string,
): Promise<ProfessionalRow[]> {
  return db
    .select(columns)
    .from(professionals)
    .leftJoin(user, eq(professionals.recommendedById, user.id))
    .where(eq(professionals.communityId, communityId))
    .orderBy(asc(professionals.trade), asc(professionals.name));
}

export async function findProfessionalById(
  db: Database,
  communityId: string,
  professionalId: string,
): Promise<ProfessionalRow | null> {
  const [row] = await db
    .select(columns)
    .from(professionals)
    .leftJoin(user, eq(professionals.recommendedById, user.id))
    .where(
      and(
        eq(professionals.id, professionalId),
        eq(professionals.communityId, communityId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function createProfessional(
  db: Database,
  values: {
    communityId: string;
    name: string;
    trade: string;
    phone: string | null;
    email: string | null;
    notes: string | null;
    recommendedById: string;
  },
): Promise<ProfessionalRow> {
  const [row] = await db
    .insert(professionals)
    .values({ id: newId('pro'), ...values })
    .returning();
  if (!row) {
    throw new Error('No se pudo crear el profesional');
  }
  return {
    id: row.id,
    communityId: row.communityId,
    name: row.name,
    trade: row.trade,
    phone: row.phone,
    email: row.email,
    notes: row.notes,
    recommendedByName: null,
    createdAt: row.createdAt,
  };
}

export async function updateProfessional(
  db: Database,
  professionalId: string,
  values: Partial<{
    name: string;
    trade: string;
    phone: string | null;
    email: string | null;
    notes: string | null;
  }>,
): Promise<void> {
  await db
    .update(professionals)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(professionals.id, professionalId));
}

export async function deleteProfessional(
  db: Database,
  professionalId: string,
): Promise<void> {
  await db.delete(professionals).where(eq(professionals.id, professionalId));
}
