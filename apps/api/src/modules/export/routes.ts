import {
  announcementSchema,
  assessmentDetailSchema,
  communitySummarySchema,
  communityIdSchema,
  expenseSchema,
  invoiceSchema,
  meetingDetailSchema,
  memberSchema,
  unitSchema,
} from '@comunidad/shared';
import { z } from 'zod';
import { Hono } from 'hono';
import { findCommunityOfUser, listMembers } from '../communities/repository';
import { listAnnouncements } from '../announcements/repository';
import { listExpenses } from '../expenses/repository';
import { listInvoices } from '../invoices/repository';
import { listMeetings } from '../meetings/repository';
import { getMeetingDetail } from '../meetings/service';
import { listAssessments, listCharges } from '../assessments/repository';
import { listUnits } from '../units/repository';
import type { Database } from '../../db/client';
import type { Auth } from '../../lib/auth';
import type { AppEnv } from '../../lib/context';
import { notFound } from '../../lib/errors';
import { pathParams, toIso } from '../../lib/http';
import { requireAuth } from '../../middleware/require-auth';
import {
  adminRoles,
  requireCommunityRole,
} from '../../middleware/require-community-role';

const communityParams = z.object({ id: communityIdSchema });

/**
 * Exportación inicial (derecho de portabilidad y salida del proveedor):
 * JSON descargable con todos los datos de la comunidad.
 */
export function exportRoutes(db: Database, auth: Auth): Hono<AppEnv> {
  const routes = new Hono<AppEnv>();

  routes.get(
    '/:id/export',
    requireAuth(auth),
    requireCommunityRole(db, adminRoles),
    async (c) => {
      const { id } = pathParams(communityParams, c.req.param());
      const community = await findCommunityOfUser(db, c.get('user').id, id);
      if (!community) {
        throw notFound('Comunidad no encontrada');
      }

      const [
        members,
        unitRows,
        announcementRows,
        meetingRows,
        expenseRows,
        invoiceRows,
        assessmentRows,
      ] = await Promise.all([
        listMembers(db, id),
        listUnits(db, id),
        listAnnouncements(db, id),
        listMeetings(db, id),
        listExpenses(db, id, 1000),
        listInvoices(db, id, 1000),
        listAssessments(db, id, 1000),
      ]);

      const meetingDetails = await Promise.all(
        meetingRows.map((meeting) => getMeetingDetail(db, id, meeting.id)),
      );
      const assessmentDetails = await Promise.all(
        assessmentRows.map(async (assessment) => ({
          assessment,
          charges: await listCharges(db, assessment.id),
        })),
      );

      const payload = {
        format: 'comunidad-vecinos/export-v1',
        exportedAt: new Date().toISOString(),
        community: communitySummarySchema.parse({
          ...community,
          createdAt: toIso(community.createdAt),
        }),
        members: z.array(memberSchema).parse(
          members.map((member) => ({
            ...member,
            createdAt: toIso(member.createdAt),
          })),
        ),
        units: z
          .array(unitSchema)
          .parse(
            unitRows.map((unit) => ({ ...unit, createdAt: toIso(unit.createdAt) })),
          ),
        announcements: z.array(announcementSchema).parse(
          announcementRows.map((row) => ({
            ...row,
            publishedAt: toIso(row.publishedAt),
            expiresAt: row.expiresAt ? toIso(row.expiresAt) : null,
          })),
        ),
        meetings: z.array(meetingDetailSchema).parse(
          meetingDetails.map((detail) => ({
            ...detail.meeting,
            scheduledFor: toIso(detail.meeting.scheduledFor),
            createdAt: toIso(detail.meeting.createdAt),
            updatedAt: toIso(detail.meeting.updatedAt),
            agenda: detail.agenda,
            agreements: detail.agreements.map((agreement) => ({
              ...agreement,
              createdAt: toIso(agreement.createdAt),
            })),
          })),
        ),
        expenses: z
          .array(expenseSchema)
          .parse(
            expenseRows.map((row) => ({ ...row, createdAt: toIso(row.createdAt) })),
          ),
        invoices: z
          .array(invoiceSchema)
          .parse(
            invoiceRows.map((row) => ({ ...row, createdAt: toIso(row.createdAt) })),
          ),
        assessments: z.array(assessmentDetailSchema).parse(
          assessmentDetails.map((detail) => ({
            ...detail.assessment,
            createdAt: toIso(detail.assessment.createdAt),
            charges: detail.charges,
          })),
        ),
      };

      return c.body(JSON.stringify(payload, null, 2), 200, {
        'content-type': 'application/json; charset=utf-8',
        'content-disposition': `attachment; filename="comunidad-${id}.json"`,
      });
    },
  );

  return routes;
}
