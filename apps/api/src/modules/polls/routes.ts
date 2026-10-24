import {
  communityIdSchema,
  createPollInputSchema,
  pollDetailSchema,
  pollSchema,
  votePollInputSchema,
} from '@comunidad/shared';
import { z } from 'zod';
import { Hono } from 'hono';
import type { Database } from '../../db/client';
import type { Auth } from '../../lib/auth';
import type { AppEnv } from '../../lib/context';
import { jsonBody, pathParams, toIso, toIsoOrNull } from '../../lib/http';
import { requireAuth } from '../../middleware/require-auth';
import {
  adminRoles,
  anyMemberRoles,
  requireCommunityRole,
} from '../../middleware/require-community-role';
import type { PollWithVotesRow } from './repository';
import { listPolls } from './repository';
import {
  closePoll,
  createPoll,
  effectiveStatus,
  getPollDetail,
  removePoll,
  votePoll,
} from './service';

const communityParams = z.object({ id: communityIdSchema });
const pollParams = z.object({
  id: communityIdSchema,
  pollId: z.string().min(1),
});

const serializePoll = (row: PollWithVotesRow) =>
  pollSchema.parse({
    ...row,
    status: effectiveStatus(row),
    closesOn: toIsoOrNull(row.closesOn),
    createdAt: toIso(row.createdAt),
  });

const serializeDetail = (detail: Awaited<ReturnType<typeof getPollDetail>>) =>
  pollDetailSchema.parse({
    ...detail.poll,
    status: detail.status,
    totalVotes: detail.totalVotes,
    closesOn: toIsoOrNull(detail.poll.closesOn),
    createdAt: toIso(detail.poll.createdAt),
    options: detail.options,
    myVoteOptionId: detail.myVoteOptionId,
  });

/**
 * Encuestas informales: un voto por miembro. Su resultado **no**
 * constituye un acuerdo vinculante (ver `POLL_NON_BINDING_NOTE`).
 */
export function pollRoutes(db: Database, auth: Auth): Hono<AppEnv> {
  const routes = new Hono<AppEnv>();

  routes.get(
    '/:id/polls',
    requireAuth(auth),
    requireCommunityRole(db, anyMemberRoles),
    async (c) => {
      const { id } = pathParams(communityParams, c.req.param());
      const rows = await listPolls(db, id);
      return c.json(z.array(pollSchema).parse(rows.map(serializePoll)));
    },
  );

  routes.post(
    '/:id/polls',
    requireAuth(auth),
    requireCommunityRole(db, adminRoles),
    async (c) => {
      const { id } = pathParams(communityParams, c.req.param());
      const input = await jsonBody(createPollInputSchema, c);
      const poll = await createPoll(db, c.get('user'), id, input);
      const detail = await getPollDetail(db, id, poll.id, c.get('user').id);
      return c.json(serializeDetail(detail), 201);
    },
  );

  routes.get(
    '/:id/polls/:pollId',
    requireAuth(auth),
    requireCommunityRole(db, anyMemberRoles),
    async (c) => {
      const { id, pollId } = pathParams(pollParams, c.req.param());
      const detail = await getPollDetail(db, id, pollId, c.get('user').id);
      return c.json(serializeDetail(detail));
    },
  );

  routes.post(
    '/:id/polls/:pollId/vote',
    requireAuth(auth),
    requireCommunityRole(db, anyMemberRoles),
    async (c) => {
      const { id, pollId } = pathParams(pollParams, c.req.param());
      const { optionId } = await jsonBody(votePollInputSchema, c);
      const detail = await votePoll(db, id, pollId, c.get('user').id, optionId);
      return c.json(serializeDetail(detail));
    },
  );

  routes.post(
    '/:id/polls/:pollId/close',
    requireAuth(auth),
    requireCommunityRole(db, adminRoles),
    async (c) => {
      const { id, pollId } = pathParams(pollParams, c.req.param());
      await closePoll(db, c.get('user'), id, pollId);
      return c.json({ ok: true });
    },
  );

  routes.delete(
    '/:id/polls/:pollId',
    requireAuth(auth),
    requireCommunityRole(db, adminRoles),
    async (c) => {
      const { id, pollId } = pathParams(pollParams, c.req.param());
      await removePoll(db, c.get('user'), id, pollId);
      return c.json({ ok: true });
    },
  );

  return routes;
}
