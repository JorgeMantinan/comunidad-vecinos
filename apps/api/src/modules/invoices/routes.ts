import {
  communityIdSchema,
  createInvoiceInputSchema,
  invoiceSchema,
  payInvoiceInputSchema,
  updateInvoiceInputSchema,
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
import { listInvoices } from './repository';
import {
  editInvoice,
  markInvoicePaid,
  registerInvoice,
  removeInvoice,
} from './service';

const communityParams = z.object({ id: communityIdSchema });
const invoiceParams = z.object({
  id: communityIdSchema,
  invoiceId: z.string().min(1),
});
const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

const serialize = (row: Awaited<ReturnType<typeof listInvoices>>[number]) =>
  invoiceSchema.parse({ ...row, createdAt: toIso(row.createdAt) });

/** Facturas de proveedores: documentos recibidos (distintos de gastos). */
export function invoiceRoutes(db: Database, auth: Auth): Hono<AppEnv> {
  const routes = new Hono<AppEnv>();

  routes.get(
    '/:id/invoices',
    requireAuth(auth),
    requireCommunityRole(db, financeReaderRoles),
    async (c) => {
      const { id } = pathParams(communityParams, c.req.param());
      const { limit } = listQuerySchema.parse({
        limit: c.req.query('limit') ?? undefined,
      });
      const rows = await listInvoices(db, id, limit);
      return c.json(z.array(invoiceSchema).parse(rows.map(serialize)));
    },
  );

  routes.post(
    '/:id/invoices',
    requireAuth(auth),
    requireCommunityRole(db, adminRoles),
    async (c) => {
      const { id } = pathParams(communityParams, c.req.param());
      const input = await jsonBody(createInvoiceInputSchema, c);
      const invoice = await registerInvoice(db, c.get('user'), id, input);
      return c.json(serialize(invoice), 201);
    },
  );

  routes.patch(
    '/:id/invoices/:invoiceId',
    requireAuth(auth),
    requireCommunityRole(db, adminRoles),
    async (c) => {
      const { id, invoiceId } = pathParams(invoiceParams, c.req.param());
      const input = await jsonBody(updateInvoiceInputSchema, c);
      await editInvoice(db, c.get('user'), id, invoiceId, input);
      return c.json({ ok: true });
    },
  );

  routes.post(
    '/:id/invoices/:invoiceId/pay',
    requireAuth(auth),
    requireCommunityRole(db, adminRoles),
    async (c) => {
      const { id, invoiceId } = pathParams(invoiceParams, c.req.param());
      const input = await jsonBody(payInvoiceInputSchema, c);
      await markInvoicePaid(db, c.get('user'), id, invoiceId, input);
      return c.json({ ok: true });
    },
  );

  routes.delete(
    '/:id/invoices/:invoiceId',
    requireAuth(auth),
    requireCommunityRole(db, adminRoles),
    async (c) => {
      const { id, invoiceId } = pathParams(invoiceParams, c.req.param());
      await removeInvoice(db, c.get('user'), id, invoiceId);
      return c.json({ ok: true });
    },
  );

  return routes;
}
