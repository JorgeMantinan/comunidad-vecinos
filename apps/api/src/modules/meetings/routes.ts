import {
  agreementSchema,
  agendaItemSchema,
  communityIdSchema,
  createAgendaItemInputSchema,
  createAgreementInputSchema,
  createMeetingInputSchema,
  meetingDetailSchema,
  meetingSchema,
  updateAgendaItemInputSchema,
  updateAgreementStatusInputSchema,
  updateMeetingInputSchema,
} from '@comunidad/shared';
import { z } from 'zod';
import { Hono } from 'hono';
import type { Database } from '../../db/client';
import type { Auth } from '../../lib/auth';
import type { AppEnv } from '../../lib/context';
import { jsonBody, pathParams, toIso } from '../../lib/http';
import { requireAuth } from '../../middleware/require-auth';
import {
  adminRoles,
  anyMemberRoles,
  requireCommunityRole,
} from '../../middleware/require-community-role';
import type { AgreementRow, AgendaItemRow, MeetingRow } from './repository';
import { listMeetings } from './repository';
import {
  addAgendaItem,
  addAgreement,
  createMeeting,
  editAgendaItem,
  getMeetingDetail,
  removeAgendaItem,
  removeMeeting,
  setAgreementStatus,
  updateMeeting,
} from './service';

const communityParams = z.object({ id: communityIdSchema });
const meetingParams = z.object({
  id: communityIdSchema,
  meetingId: z.string().min(1),
});
const agendaParams = meetingParams.extend({ itemId: z.string().min(1) });
const agreementParams = meetingParams.extend({
  agreementId: z.string().min(1),
});

const serializeMeeting = (row: MeetingRow) =>
  meetingSchema.parse({
    ...row,
    scheduledFor: toIso(row.scheduledFor),
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  });

const serializeAgenda = (row: AgendaItemRow) => agendaItemSchema.parse(row);

const serializeAgreement = (
  row: AgreementRow & {
    linkedTask?: { id: string; title: string; status: string } | null;
  },
) =>
  agreementSchema.parse({
    ...row,
    linkedTask: row.linkedTask ?? null,
    createdAt: toIso(row.createdAt),
  });

/** Reuniones: convocatoria, orden del día, acta y acuerdos. */
export function meetingRoutes(db: Database, auth: Auth): Hono<AppEnv> {
  const routes = new Hono<AppEnv>();

  routes.get(
    '/:id/meetings',
    requireAuth(auth),
    requireCommunityRole(db, anyMemberRoles),
    async (c) => {
      const { id } = pathParams(communityParams, c.req.param());
      const rows = await listMeetings(db, id);
      return c.json(z.array(meetingSchema).parse(rows.map(serializeMeeting)));
    },
  );

  routes.post(
    '/:id/meetings',
    requireAuth(auth),
    requireCommunityRole(db, adminRoles),
    async (c) => {
      const { id } = pathParams(communityParams, c.req.param());
      const input = await jsonBody(createMeetingInputSchema, c);
      const meeting = await createMeeting(db, c.get('user'), id, input);
      return c.json(serializeMeeting(meeting), 201);
    },
  );

  routes.get(
    '/:id/meetings/:meetingId',
    requireAuth(auth),
    requireCommunityRole(db, anyMemberRoles),
    async (c) => {
      const { id, meetingId } = pathParams(meetingParams, c.req.param());
      const detail = await getMeetingDetail(db, id, meetingId);
      return c.json(
        meetingDetailSchema.parse({
          ...serializeMeeting(detail.meeting),
          agenda: detail.agenda.map(serializeAgenda),
          agreements: detail.agreements.map(serializeAgreement),
        }),
      );
    },
  );

  routes.patch(
    '/:id/meetings/:meetingId',
    requireAuth(auth),
    requireCommunityRole(db, adminRoles),
    async (c) => {
      const { id, meetingId } = pathParams(meetingParams, c.req.param());
      const input = await jsonBody(updateMeetingInputSchema, c);
      await updateMeeting(db, c.get('user'), id, meetingId, input);
      return c.json({ ok: true });
    },
  );

  routes.delete(
    '/:id/meetings/:meetingId',
    requireAuth(auth),
    requireCommunityRole(db, adminRoles),
    async (c) => {
      const { id, meetingId } = pathParams(meetingParams, c.req.param());
      await removeMeeting(db, c.get('user'), id, meetingId);
      return c.json({ ok: true });
    },
  );

  routes.post(
    '/:id/meetings/:meetingId/agenda',
    requireAuth(auth),
    requireCommunityRole(db, adminRoles),
    async (c) => {
      const { id, meetingId } = pathParams(meetingParams, c.req.param());
      const input = await jsonBody(createAgendaItemInputSchema, c);
      const item = await addAgendaItem(db, c.get('user'), id, meetingId, input);
      return c.json(serializeAgenda(item), 201);
    },
  );

  routes.patch(
    '/:id/meetings/:meetingId/agenda/:itemId',
    requireAuth(auth),
    requireCommunityRole(db, adminRoles),
    async (c) => {
      const { id, meetingId, itemId } = pathParams(agendaParams, c.req.param());
      const input = await jsonBody(updateAgendaItemInputSchema, c);
      await editAgendaItem(db, c.get('user'), id, meetingId, itemId, input);
      return c.json({ ok: true });
    },
  );

  routes.delete(
    '/:id/meetings/:meetingId/agenda/:itemId',
    requireAuth(auth),
    requireCommunityRole(db, adminRoles),
    async (c) => {
      const { id, meetingId, itemId } = pathParams(agendaParams, c.req.param());
      await removeAgendaItem(db, c.get('user'), id, meetingId, itemId);
      return c.json({ ok: true });
    },
  );

  routes.post(
    '/:id/meetings/:meetingId/agreements',
    requireAuth(auth),
    requireCommunityRole(db, adminRoles),
    async (c) => {
      const { id, meetingId } = pathParams(meetingParams, c.req.param());
      const input = await jsonBody(createAgreementInputSchema, c);
      const agreement = await addAgreement(db, c.get('user'), id, meetingId, input);
      return c.json(serializeAgreement({ ...agreement, linkedTask: null }), 201);
    },
  );

  routes.patch(
    '/:id/meetings/:meetingId/agreements/:agreementId',
    requireAuth(auth),
    requireCommunityRole(db, adminRoles),
    async (c) => {
      const { id, meetingId, agreementId } = pathParams(agreementParams, c.req.param());
      const { status } = await jsonBody(updateAgreementStatusInputSchema, c);
      await setAgreementStatus(db, c.get('user'), id, meetingId, agreementId, status);
      return c.json({ ok: true });
    },
  );

  return routes;
}
