import {
  announcementSchema,
  assessmentDetailSchema,
  assetSchema,
  communitySummarySchema,
  communityIdSchema,
  contractSchema,
  documentSchema,
  expenseSchema,
  incidentSchema,
  invoiceSchema,
  meetingDetailSchema,
  memberSchema,
  pollDetailSchema,
  professionalSchema,
  suggestionSchema,
  taskSchema,
  unitSchema,
} from '@comunidad/shared';
import { z } from 'zod';
import { Hono } from 'hono';
import { findCommunityOfUser, listMembers } from '../communities/repository';
import { listAnnouncements } from '../announcements/repository';
import { listAssets } from '../assets/repository';
import { listContracts } from '../contracts/repository';
import { listDocuments } from '../documents/repository';
import { listExpenses } from '../expenses/repository';
import { listIncidents, listPhotosByCommunity } from '../incidents/repository';
import { listInvoices } from '../invoices/repository';
import { listMeetings } from '../meetings/repository';
import { getMeetingDetail } from '../meetings/service';
import { listAssessments, listCharges } from '../assessments/repository';
import { listPolls } from '../polls/repository';
import { getPollDetail } from '../polls/service';
import { listProfessionals } from '../professionals/repository';
import { listSuggestions } from '../suggestions/repository';
import { listTasks } from '../tasks/repository';
import { listUnits } from '../units/repository';
import type { Database } from '../../db/client';
import type { Auth } from '../../lib/auth';
import type { AppEnv } from '../../lib/context';
import { notFound } from '../../lib/errors';
import { pathParams, toIso, toIsoOrNull } from '../../lib/http';
import { requireAuth } from '../../middleware/require-auth';
import {
  adminRoles,
  requireCommunityRole,
} from '../../middleware/require-community-role';

const communityParams = z.object({ id: communityIdSchema });

/**
 * Exportación inicial (derecho de portabilidad y salida del proveedor):
 * JSON descargable con todos los datos de la comunidad.
 *
 * Los votos de encuestas se exportan agregados (recuentos por opción),
 * sin vincularlos a personas: minimización de datos.
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
        incidentRows,
        taskRows,
        suggestionRows,
        pollRows,
        assetRows,
        contractRows,
        professionalRows,
        documentRows,
        photoRows,
      ] = await Promise.all([
        listMembers(db, id),
        listUnits(db, id),
        listAnnouncements(db, id),
        listMeetings(db, id),
        listExpenses(db, id, 1000),
        listInvoices(db, id, 1000),
        listAssessments(db, id, 1000),
        listIncidents(db, id),
        listTasks(db, id),
        listSuggestions(db, id),
        listPolls(db, id),
        listAssets(db, id),
        listContracts(db, id),
        listProfessionals(db, id),
        listDocuments(db, id),
        listPhotosByCommunity(db, id),
      ]);

      const photosByIncident = new Map<string, typeof photoRows>();
      for (const photo of photoRows) {
        const list = photosByIncident.get(photo.incidentId) ?? [];
        list.push(photo);
        photosByIncident.set(photo.incidentId, list);
      }

      const meetingDetails = await Promise.all(
        meetingRows.map((meeting) => getMeetingDetail(db, id, meeting.id)),
      );
      const assessmentDetails = await Promise.all(
        assessmentRows.map(async (assessment) => ({
          assessment,
          charges: await listCharges(db, assessment.id),
        })),
      );
      const pollDetails = await Promise.all(
        pollRows.map(async (poll) => getPollDetail(db, id, poll.id)),
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
            expiresAt: toIsoOrNull(row.expiresAt),
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
        incidents: z.array(incidentSchema).parse(
          incidentRows.map((row) => ({
            ...row,
            resolvedAt: toIsoOrNull(row.resolvedAt),
            createdAt: toIso(row.createdAt),
            photos: (photosByIncident.get(row.id) ?? []).map((photo) => ({
              id: photo.id,
              contentType: photo.contentType,
              sizeBytes: photo.sizeBytes,
              uploadedByName: photo.uploadedByName,
              createdAt: toIso(photo.createdAt),
            })),
          })),
        ),
        documents: z.array(documentSchema).parse(
          documentRows.map((row) => ({
            ...row,
            createdAt: toIso(row.createdAt),
          })),
        ),
        tasks: z
          .array(taskSchema)
          .parse(taskRows.map((row) => ({ ...row, createdAt: toIso(row.createdAt) }))),
        suggestions: z.array(suggestionSchema).parse(
          suggestionRows.map((row) => ({
            ...row,
            createdAt: toIso(row.createdAt),
          })),
        ),
        polls: z.array(pollDetailSchema).parse(
          pollDetails.map((detail) => ({
            ...detail.poll,
            status: detail.status,
            totalVotes: detail.totalVotes,
            closesOn: toIsoOrNull(detail.poll.closesOn),
            createdAt: toIso(detail.poll.createdAt),
            options: detail.options,
            myVoteOptionId: null,
          })),
        ),
        assets: z
          .array(assetSchema)
          .parse(assetRows.map((row) => ({ ...row, createdAt: toIso(row.createdAt) }))),
        contracts: z.array(contractSchema).parse(
          contractRows.map((row) => ({
            ...row,
            createdAt: toIso(row.createdAt),
          })),
        ),
        professionals: z.array(professionalSchema).parse(
          professionalRows.map((row) => ({
            ...row,
            createdAt: toIso(row.createdAt),
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
