import {
  communityIdSchema,
  createTaskInputSchema,
  taskSchema,
  updateTaskInputSchema,
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
import { listTasks } from './repository';
import { createTask, editTask, removeTask } from './service';

const communityParams = z.object({ id: communityIdSchema });
const taskParams = z.object({
  id: communityIdSchema,
  taskId: z.string().min(1),
});

const serialize = (row: Awaited<ReturnType<typeof listTasks>>[number]) =>
  taskSchema.parse({ ...row, createdAt: toIso(row.createdAt) });

/** Tareas: visibles para miembros, gestión para owner/admin. */
export function taskRoutes(db: Database, auth: Auth): Hono<AppEnv> {
  const routes = new Hono<AppEnv>();

  routes.get(
    '/:id/tasks',
    requireAuth(auth),
    requireCommunityRole(db, anyMemberRoles),
    async (c) => {
      const { id } = pathParams(communityParams, c.req.param());
      const rows = await listTasks(db, id);
      return c.json(z.array(taskSchema).parse(rows.map(serialize)));
    },
  );

  routes.post(
    '/:id/tasks',
    requireAuth(auth),
    requireCommunityRole(db, adminRoles),
    async (c) => {
      const { id } = pathParams(communityParams, c.req.param());
      const input = await jsonBody(createTaskInputSchema, c);
      const task = await createTask(db, c.get('user'), id, input);
      return c.json(
        taskSchema.parse({ ...task, createdAt: toIso(task.createdAt) }),
        201,
      );
    },
  );

  routes.patch(
    '/:id/tasks/:taskId',
    requireAuth(auth),
    requireCommunityRole(db, adminRoles),
    async (c) => {
      const { id, taskId } = pathParams(taskParams, c.req.param());
      const input = await jsonBody(updateTaskInputSchema, c);
      await editTask(db, c.get('user'), id, taskId, input);
      return c.json({ ok: true });
    },
  );

  routes.delete(
    '/:id/tasks/:taskId',
    requireAuth(auth),
    requireCommunityRole(db, adminRoles),
    async (c) => {
      const { id, taskId } = pathParams(taskParams, c.req.param());
      await removeTask(db, c.get('user'), id, taskId);
      return c.json({ ok: true });
    },
  );

  return routes;
}
