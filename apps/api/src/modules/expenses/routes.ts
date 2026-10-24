import {
  communityIdSchema,
  createExpenseInputSchema,
  expenseSchema,
  payExpenseInputSchema,
  updateExpenseInputSchema,
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
  financeReaderRoles,
  requireCommunityRole,
} from '../../middleware/require-community-role';
import { listExpenses } from './repository';
import { editExpense, markExpensePaid, recordExpense, removeExpense } from './service';

const communityParams = z.object({ id: communityIdSchema });
const expenseParams = z.object({
  id: communityIdSchema,
  expenseId: z.string().min(1),
});
const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

const serialize = (row: Awaited<ReturnType<typeof listExpenses>>[number]) =>
  expenseSchema.parse({ ...row, createdAt: toIso(row.createdAt) });

/** Gastos comunes: lectura para propietarios, gestión para admin. */
export function expenseRoutes(db: Database, auth: Auth): Hono<AppEnv> {
  const routes = new Hono<AppEnv>();

  routes.get(
    '/:id/expenses',
    requireAuth(auth),
    requireCommunityRole(db, financeReaderRoles),
    async (c) => {
      const { id } = pathParams(communityParams, c.req.param());
      const { limit } = listQuerySchema.parse({
        limit: c.req.query('limit') ?? undefined,
      });
      const rows = await listExpenses(db, id, limit);
      return c.json(z.array(expenseSchema).parse(rows.map(serialize)));
    },
  );

  routes.post(
    '/:id/expenses',
    requireAuth(auth),
    requireCommunityRole(db, adminRoles),
    async (c) => {
      const { id } = pathParams(communityParams, c.req.param());
      const input = await jsonBody(createExpenseInputSchema, c);
      const expense = await recordExpense(db, c.get('user'), id, input);
      return c.json(serialize(expense), 201);
    },
  );

  routes.patch(
    '/:id/expenses/:expenseId',
    requireAuth(auth),
    requireCommunityRole(db, adminRoles),
    async (c) => {
      const { id, expenseId } = pathParams(expenseParams, c.req.param());
      const input = await jsonBody(updateExpenseInputSchema, c);
      await editExpense(db, c.get('user'), id, expenseId, input);
      return c.json({ ok: true });
    },
  );

  /** Transición de estado: registrado → pagado. */
  routes.post(
    '/:id/expenses/:expenseId/pay',
    requireAuth(auth),
    requireCommunityRole(db, adminRoles),
    async (c) => {
      const { id, expenseId } = pathParams(expenseParams, c.req.param());
      const input = await jsonBody(payExpenseInputSchema, c);
      await markExpensePaid(db, c.get('user'), id, expenseId, input);
      return c.json({ ok: true });
    },
  );

  routes.delete(
    '/:id/expenses/:expenseId',
    requireAuth(auth),
    requireCommunityRole(db, adminRoles),
    async (c) => {
      const { id, expenseId } = pathParams(expenseParams, c.req.param());
      await removeExpense(db, c.get('user'), id, expenseId);
      return c.json({ ok: true });
    },
  );

  return routes;
}
