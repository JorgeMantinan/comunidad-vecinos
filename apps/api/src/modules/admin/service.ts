import type { AdminCommunitySummary } from '@comunidad/shared';
import { and, asc, eq, gt, inArray, isNull, lte, ne, sql } from 'drizzle-orm';
import type { Database } from '../../db/client';
import {
  communityMemberships,
  communities,
  expenses,
  incidents,
  invitations,
  maintenanceContracts,
  tasks,
} from '../../db/schema';

const ADMIN_ROLES = ['owner', 'admin'] as const;

const countByCommunity = (
  rows: Array<{ communityId: string; value: number | string }>,
): Map<string, number> =>
  new Map(rows.map((row) => [row.communityId, Number(row.value)]));

/**
 * Vista agregada del panel de administración de fincas: solo comunidades
 * donde el usuario es `owner` o `admin` (nunca una vista global).
 */
export async function buildAdminOverview(
  db: Database,
  userId: string,
): Promise<AdminCommunitySummary[]> {
  const mine = await db
    .select({
      communityId: communityMemberships.communityId,
      role: communityMemberships.role,
      name: communities.name,
      address: communities.address,
    })
    .from(communityMemberships)
    .innerJoin(communities, eq(communityMemberships.communityId, communities.id))
    .where(
      and(
        eq(communityMemberships.userId, userId),
        inArray(communityMemberships.role, [...ADMIN_ROLES]),
      ),
    )
    .orderBy(asc(communities.name));

  if (mine.length === 0) {
    return [];
  }
  const ids = mine.map((row) => row.communityId);
  const renewLimit = new Date(Date.now() + 30 * 24 * 3600_000);

  const [members, openIncidents, openTasks, pendingInvites, renewing, unpaid] =
    await Promise.all([
      db
        .select({
          communityId: communityMemberships.communityId,
          value: sql<number>`count(*)`,
        })
        .from(communityMemberships)
        .where(inArray(communityMemberships.communityId, ids))
        .groupBy(communityMemberships.communityId),
      db
        .select({
          communityId: incidents.communityId,
          value: sql<number>`count(*)`,
        })
        .from(incidents)
        .where(
          and(inArray(incidents.communityId, ids), ne(incidents.status, 'resolved')),
        )
        .groupBy(incidents.communityId),
      db
        .select({
          communityId: tasks.communityId,
          value: sql<number>`count(*)`,
        })
        .from(tasks)
        .where(and(inArray(tasks.communityId, ids), ne(tasks.status, 'done')))
        .groupBy(tasks.communityId),
      db
        .select({
          communityId: invitations.communityId,
          value: sql<number>`count(*)`,
        })
        .from(invitations)
        .where(
          and(
            inArray(invitations.communityId, ids),
            isNull(invitations.acceptedAt),
            isNull(invitations.revokedAt),
            gt(invitations.expiresAt, new Date()),
          ),
        )
        .groupBy(invitations.communityId),
      db
        .select({
          communityId: maintenanceContracts.communityId,
          value: sql<number>`count(*)`,
        })
        .from(maintenanceContracts)
        .where(
          and(
            inArray(maintenanceContracts.communityId, ids),
            eq(maintenanceContracts.status, 'active'),
            lte(maintenanceContracts.renewalOn, renewLimit.toISOString().slice(0, 10)),
          ),
        )
        .groupBy(maintenanceContracts.communityId),
      db
        .select({
          communityId: expenses.communityId,
          value: sql<string>`coalesce(sum(${expenses.amount}), 0)`,
        })
        .from(expenses)
        .where(
          and(inArray(expenses.communityId, ids), eq(expenses.status, 'registered')),
        )
        .groupBy(expenses.communityId),
    ]);

  const membersMap = countByCommunity(members);
  const incidentsMap = countByCommunity(openIncidents);
  const tasksMap = countByCommunity(openTasks);
  const invitesMap = countByCommunity(pendingInvites);
  const renewMap = countByCommunity(renewing);
  const unpaidMap = new Map(
    unpaid.map((row) => [row.communityId, Number(row.value).toFixed(2)]),
  );

  return mine.map((row) => ({
    id: row.communityId,
    name: row.name,
    address: row.address,
    role: row.role as 'owner' | 'admin',
    metrics: {
      members: membersMap.get(row.communityId) ?? 0,
      openIncidents: incidentsMap.get(row.communityId) ?? 0,
      openTasks: tasksMap.get(row.communityId) ?? 0,
      pendingInvitations: invitesMap.get(row.communityId) ?? 0,
      contractsRenewingSoon: renewMap.get(row.communityId) ?? 0,
      unpaidExpenses: unpaidMap.get(row.communityId) ?? '0.00',
    },
  }));
}
