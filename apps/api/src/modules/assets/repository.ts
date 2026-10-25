import { and, asc, eq } from 'drizzle-orm';
import type { AssetCategory, AssetStatus } from '@comunidad/shared';
import type { Database } from '../../db/client';
import { assets } from '../../db/schema';
import { newId } from '../../lib/ids';

export interface AssetRow {
  id: string;
  communityId: string;
  name: string;
  category: AssetCategory;
  location: string | null;
  status: AssetStatus;
  warrantyUntil: string | null;
  notes: string | null;
  createdAt: Date;
}

const columns = {
  id: assets.id,
  communityId: assets.communityId,
  name: assets.name,
  category: assets.category,
  location: assets.location,
  status: assets.status,
  warrantyUntil: assets.warrantyUntil,
  notes: assets.notes,
  createdAt: assets.createdAt,
} as const;

/** Elementos comunes de la comunidad, ordenados por nombre. */
export async function listAssets(
  db: Database,
  communityId: string,
): Promise<AssetRow[]> {
  return db
    .select(columns)
    .from(assets)
    .where(eq(assets.communityId, communityId))
    .orderBy(asc(assets.name));
}

export async function findAssetById(
  db: Database,
  communityId: string,
  assetId: string,
): Promise<AssetRow | null> {
  const [row] = await db
    .select(columns)
    .from(assets)
    .where(and(eq(assets.id, assetId), eq(assets.communityId, communityId)))
    .limit(1);
  return row ?? null;
}

export async function createAsset(
  db: Database,
  values: {
    communityId: string;
    name: string;
    category: AssetCategory;
    location: string | null;
    warrantyUntil: string | null;
    notes: string | null;
    createdById: string;
  },
): Promise<AssetRow> {
  const [row] = await db
    .insert(assets)
    .values({ id: newId('ast'), status: 'operational', ...values })
    .returning(columns);
  if (!row) {
    throw new Error('No se pudo crear el activo');
  }
  return row;
}

export async function updateAsset(
  db: Database,
  assetId: string,
  values: Partial<{
    name: string;
    category: AssetCategory;
    location: string | null;
    status: AssetStatus;
    warrantyUntil: string | null;
    notes: string | null;
  }>,
): Promise<void> {
  await db
    .update(assets)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(assets.id, assetId));
}

export async function deleteAsset(db: Database, assetId: string): Promise<void> {
  await db.delete(assets).where(eq(assets.id, assetId));
}
