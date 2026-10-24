import { and, desc, eq } from 'drizzle-orm';
import type { IncidentStatus } from '@comunidad/shared';
import type { Database } from '../../db/client';
import { incidents, user } from '../../db/schema';
import { newId } from '../../lib/ids';

export interface IncidentRow {
  id: string;
  communityId: string;
  title: string;
  description: string;
  status: IncidentStatus;
  reportedByName: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
}

const columns = {
  id: incidents.id,
  communityId: incidents.communityId,
  title: incidents.title,
  description: incidents.description,
  status: incidents.status,
  reportedByName: user.name,
  resolvedAt: incidents.resolvedAt,
  createdAt: incidents.createdAt,
} as const;

/** Incidencias de la comunidad, primero las más recientes. */
export async function listIncidents(
  db: Database,
  communityId: string,
): Promise<IncidentRow[]> {
  return db
    .select(columns)
    .from(incidents)
    .leftJoin(user, eq(incidents.reportedById, user.id))
    .where(eq(incidents.communityId, communityId))
    .orderBy(desc(incidents.createdAt));
}

export async function findIncidentById(
  db: Database,
  communityId: string,
  incidentId: string,
): Promise<IncidentRow | null> {
  const [row] = await db
    .select(columns)
    .from(incidents)
    .leftJoin(user, eq(incidents.reportedById, user.id))
    .where(and(eq(incidents.id, incidentId), eq(incidents.communityId, communityId)))
    .limit(1);
  return row ?? null;
}

export async function createIncident(
  db: Database,
  values: {
    communityId: string;
    title: string;
    description: string;
    reportedById: string;
  },
): Promise<IncidentRow> {
  const [row] = await db
    .insert(incidents)
    .values({ id: newId('inc'), status: 'open', ...values })
    .returning();
  if (!row) {
    throw new Error('No se pudo crear la incidencia');
  }
  return {
    id: row.id,
    communityId: row.communityId,
    title: row.title,
    description: row.description,
    status: row.status,
    reportedByName: null,
    resolvedAt: row.resolvedAt,
    createdAt: row.createdAt,
  };
}

export async function updateIncident(
  db: Database,
  incidentId: string,
  values: Partial<{
    title: string;
    description: string;
    status: IncidentStatus;
    resolvedAt: Date | null;
  }>,
): Promise<void> {
  await db
    .update(incidents)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(incidents.id, incidentId));
}

export async function deleteIncident(db: Database, incidentId: string): Promise<void> {
  await db.delete(incidents).where(eq(incidents.id, incidentId));
}
