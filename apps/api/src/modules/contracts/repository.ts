import { and, asc, eq } from 'drizzle-orm';
import type { ContractStatus } from '@comunidad/shared';
import type { Database } from '../../db/client';
import { maintenanceContracts } from '../../db/schema';
import { newId } from '../../lib/ids';

export interface ContractRow {
  id: string;
  communityId: string;
  provider: string;
  service: string;
  amount: string;
  startOn: string;
  renewalOn: string;
  status: ContractStatus;
  notes: string | null;
  createdAt: Date;
}

const columns = {
  id: maintenanceContracts.id,
  communityId: maintenanceContracts.communityId,
  provider: maintenanceContracts.provider,
  service: maintenanceContracts.service,
  amount: maintenanceContracts.amount,
  startOn: maintenanceContracts.startOn,
  renewalOn: maintenanceContracts.renewalOn,
  status: maintenanceContracts.status,
  notes: maintenanceContracts.notes,
  createdAt: maintenanceContracts.createdAt,
} as const;

/** Contratos vigentes primero, después los finalizados; por renovación. */
export async function listContracts(
  db: Database,
  communityId: string,
): Promise<ContractRow[]> {
  return db
    .select(columns)
    .from(maintenanceContracts)
    .where(eq(maintenanceContracts.communityId, communityId))
    .orderBy(asc(maintenanceContracts.status), asc(maintenanceContracts.renewalOn));
}

export async function findContractById(
  db: Database,
  communityId: string,
  contractId: string,
): Promise<ContractRow | null> {
  const [row] = await db
    .select(columns)
    .from(maintenanceContracts)
    .where(
      and(
        eq(maintenanceContracts.id, contractId),
        eq(maintenanceContracts.communityId, communityId),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function createContract(
  db: Database,
  values: {
    communityId: string;
    provider: string;
    service: string;
    amount: string;
    startOn: string;
    renewalOn: string;
    notes: string | null;
    createdById: string;
  },
): Promise<ContractRow> {
  const [row] = await db
    .insert(maintenanceContracts)
    .values({ id: newId('ctc'), status: 'active', ...values })
    .returning(columns);
  if (!row) {
    throw new Error('No se pudo crear el contrato');
  }
  return row;
}

export async function updateContract(
  db: Database,
  contractId: string,
  values: Partial<{
    provider: string;
    service: string;
    amount: string;
    startOn: string;
    renewalOn: string;
    status: ContractStatus;
    notes: string | null;
  }>,
): Promise<void> {
  await db
    .update(maintenanceContracts)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(maintenanceContracts.id, contractId));
}

export async function deleteContract(db: Database, contractId: string): Promise<void> {
  await db.delete(maintenanceContracts).where(eq(maintenanceContracts.id, contractId));
}
