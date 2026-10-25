import { and, eq, gte, ne, sql } from 'drizzle-orm';
import type { Database } from '../../db/client';
import {
  announcements,
  auditEvents,
  communityMemberships,
  documents,
  documentTemplates,
  expenses,
  incidents,
  invoices,
  meetings,
  professionals,
  suggestions,
  tasks,
  units,
  assessments,
} from '../../db/schema';

const count = (value: number | string | null | undefined): number => Number(value ?? 0);
const euros = (value: number | string | null | undefined): string =>
  Number(value ?? 0).toFixed(2);

/**
 * Estadísticas de uso de una comunidad: consultas SQL agregadas
 * directas. Sin IA ni proveedores externos (ADR 006): sin coste por
 * consulta.
 */
export async function buildCommunityStats(
  db: Database,
  communityId: string,
): Promise<{
  members: number;
  units: number;
  announcements: number;
  meetings: number;
  suggestions: number;
  professionals: number;
  documents: number;
  templates: number;
  assessments: number;
  incidents: { total: number; open: number };
  tasks: { total: number; done: number };
  expenses: { count: number; total: string; paidTotal: string };
  invoices: { count: number; total: string };
  recentActivity: number;
}> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600_000);

  const [
    members,
    unitCount,
    announcementCount,
    meetingCount,
    suggestionCount,
    professionalCount,
    documentCount,
    templateCount,
    assessmentCount,
    incidentTotal,
    incidentOpen,
    taskTotal,
    taskDone,
    expenseTotals,
    invoiceTotals,
    recentActivity,
  ] = await Promise.all([
    db
      .select({ value: sql<string>`count(*)` })
      .from(communityMemberships)
      .where(eq(communityMemberships.communityId, communityId)),
    db
      .select({ value: sql<string>`count(*)` })
      .from(units)
      .where(eq(units.communityId, communityId)),
    db
      .select({ value: sql<string>`count(*)` })
      .from(announcements)
      .where(eq(announcements.communityId, communityId)),
    db
      .select({ value: sql<string>`count(*)` })
      .from(meetings)
      .where(eq(meetings.communityId, communityId)),
    db
      .select({ value: sql<string>`count(*)` })
      .from(suggestions)
      .where(eq(suggestions.communityId, communityId)),
    db
      .select({ value: sql<string>`count(*)` })
      .from(professionals)
      .where(eq(professionals.communityId, communityId)),
    db
      .select({ value: sql<string>`count(*)` })
      .from(documents)
      .where(eq(documents.communityId, communityId)),
    db
      .select({ value: sql<string>`count(*)` })
      .from(documentTemplates)
      .where(eq(documentTemplates.communityId, communityId)),
    db
      .select({ value: sql<string>`count(*)` })
      .from(assessments)
      .where(eq(assessments.communityId, communityId)),
    db
      .select({ value: sql<string>`count(*)` })
      .from(incidents)
      .where(eq(incidents.communityId, communityId)),
    db
      .select({ value: sql<string>`count(*)` })
      .from(incidents)
      .where(
        and(eq(incidents.communityId, communityId), ne(incidents.status, 'resolved')),
      ),
    db
      .select({ value: sql<string>`count(*)` })
      .from(tasks)
      .where(eq(tasks.communityId, communityId)),
    db
      .select({ value: sql<string>`count(*)` })
      .from(tasks)
      .where(and(eq(tasks.communityId, communityId), eq(tasks.status, 'done'))),
    db
      .select({
        count: sql<string>`count(*)`,
        total: sql<string>`coalesce(sum(${expenses.amount}), 0)`,
        paid: sql<string>`coalesce(sum(case when ${expenses.status} = 'paid' then ${expenses.amount} else 0 end), 0)`,
      })
      .from(expenses)
      .where(eq(expenses.communityId, communityId)),
    db
      .select({
        count: sql<string>`count(*)`,
        total: sql<string>`coalesce(sum(${invoices.amount}), 0)`,
      })
      .from(invoices)
      .where(eq(invoices.communityId, communityId)),
    db
      .select({ value: sql<string>`count(*)` })
      .from(auditEvents)
      .where(
        and(
          eq(auditEvents.communityId, communityId),
          gte(auditEvents.createdAt, thirtyDaysAgo),
        ),
      ),
  ]);

  return {
    members: count(members[0]?.value),
    units: count(unitCount[0]?.value),
    announcements: count(announcementCount[0]?.value),
    meetings: count(meetingCount[0]?.value),
    suggestions: count(suggestionCount[0]?.value),
    professionals: count(professionalCount[0]?.value),
    documents: count(documentCount[0]?.value),
    templates: count(templateCount[0]?.value),
    assessments: count(assessmentCount[0]?.value),
    incidents: {
      total: count(incidentTotal[0]?.value),
      open: count(incidentOpen[0]?.value),
    },
    tasks: { total: count(taskTotal[0]?.value), done: count(taskDone[0]?.value) },
    expenses: {
      count: count(expenseTotals[0]?.count),
      total: euros(expenseTotals[0]?.total ?? 0),
      paidTotal: euros(expenseTotals[0]?.paid ?? 0),
    },
    invoices: {
      count: count(invoiceTotals[0]?.count),
      total: euros(invoiceTotals[0]?.total ?? 0),
    },
    recentActivity: count(recentActivity[0]?.value),
  };
}
