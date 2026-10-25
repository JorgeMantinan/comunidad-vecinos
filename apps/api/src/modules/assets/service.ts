import type { CreateAssetInput, UpdateAssetInput } from '@comunidad/shared';
import { recordAuditEvent } from '../../lib/audit';
import type { Database } from '../../db/client';
import { notFound } from '../../lib/errors';
import * as repo from './repository';
import type { AssetRow } from './repository';

export interface Actor {
  id: string;
}

export async function addAsset(
  db: Database,
  actor: Actor,
  communityId: string,
  input: CreateAssetInput,
): Promise<AssetRow> {
  const asset = await repo.createAsset(db, {
    communityId,
    name: input.name,
    category: input.category,
    location: input.location ?? null,
    warrantyUntil: input.warrantyUntil ?? null,
    notes: input.notes ?? null,
    createdById: actor.id,
  });

  await recordAuditEvent(db, {
    communityId,
    actorId: actor.id,
    action: 'asset.created',
    targetType: 'asset',
    targetId: asset.id,
    metadata: { name: asset.name, category: asset.category },
  });

  return asset;
}

export async function editAsset(
  db: Database,
  actor: Actor,
  communityId: string,
  assetId: string,
  input: UpdateAssetInput,
): Promise<void> {
  const existing = await repo.findAssetById(db, communityId, assetId);
  if (!existing) {
    throw notFound('Elemento no encontrado');
  }

  const values: Parameters<typeof repo.updateAsset>[2] = {};
  if (input.name !== undefined) values.name = input.name;
  if (input.category !== undefined) values.category = input.category;
  if (input.location !== undefined) values.location = input.location;
  if (input.status !== undefined) values.status = input.status;
  if (input.warrantyUntil !== undefined) {
    values.warrantyUntil = input.warrantyUntil;
  }
  if (input.notes !== undefined) values.notes = input.notes;
  if (Object.keys(values).length === 0) {
    return;
  }

  await repo.updateAsset(db, assetId, values);
  await recordAuditEvent(db, {
    communityId,
    actorId: actor.id,
    action: 'asset.updated',
    targetType: 'asset',
    targetId: assetId,
    metadata: { fields: Object.keys(values) },
  });
}

export async function removeAsset(
  db: Database,
  actor: Actor,
  communityId: string,
  assetId: string,
): Promise<void> {
  const existing = await repo.findAssetById(db, communityId, assetId);
  if (!existing) {
    throw notFound('Elemento no encontrado');
  }

  await repo.deleteAsset(db, assetId);
  await recordAuditEvent(db, {
    communityId,
    actorId: actor.id,
    action: 'asset.deleted',
    targetType: 'asset',
    targetId: assetId,
    metadata: { name: existing.name },
  });
}
