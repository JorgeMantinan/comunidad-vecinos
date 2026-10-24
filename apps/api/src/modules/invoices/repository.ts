import { and, desc, eq } from 'drizzle-orm';
import type { InvoiceStatus } from '@comunidad/shared';
import type { Database } from '../../db/client';
import { invoices } from '../../db/schema';
import { newId } from '../../lib/ids';

export interface InvoiceRow {
  id: string;
  communityId: string;
  number: string;
  supplier: string;
  amount: string;
  issuedOn: string;
  status: InvoiceStatus;
  paidOn: string | null;
  notes: string | null;
  createdAt: Date;
}

const columns = {
  id: invoices.id,
  communityId: invoices.communityId,
  number: invoices.number,
  supplier: invoices.supplier,
  amount: invoices.amount,
  issuedOn: invoices.issuedOn,
  status: invoices.status,
  paidOn: invoices.paidOn,
  notes: invoices.notes,
  createdAt: invoices.createdAt,
} as const;

interface InvoiceValues {
  communityId: string;
  number: string;
  supplier: string;
  amount: string;
  issuedOn: string;
  notes: string | null;
  createdById: string;
}

/** Facturas de la comunidad, de la más reciente a la más antigua. */
export async function listInvoices(
  db: Database,
  communityId: string,
  limit = 100,
): Promise<InvoiceRow[]> {
  return db
    .select(columns)
    .from(invoices)
    .where(eq(invoices.communityId, communityId))
    .orderBy(desc(invoices.issuedOn), desc(invoices.createdAt))
    .limit(limit);
}

export async function findInvoiceById(
  db: Database,
  communityId: string,
  invoiceId: string,
): Promise<InvoiceRow | null> {
  const [row] = await db
    .select(columns)
    .from(invoices)
    .where(eq(invoices.id, invoiceId))
    .limit(1);
  if (!row || row.communityId !== communityId) {
    return null;
  }
  return row;
}

export async function findInvoiceByNumber(
  db: Database,
  communityId: string,
  number: string,
): Promise<InvoiceRow | null> {
  const [row] = await db
    .select(columns)
    .from(invoices)
    .where(and(eq(invoices.number, number), eq(invoices.communityId, communityId)))
    .limit(1);
  return row ?? null;
}

export async function createInvoice(
  db: Database,
  values: InvoiceValues,
): Promise<InvoiceRow> {
  const [row] = await db
    .insert(invoices)
    .values({ id: newId('fac'), status: 'received', ...values })
    .returning(columns);
  if (!row) {
    throw new Error('No se pudo registrar la factura');
  }
  return row;
}

export async function updateInvoice(
  db: Database,
  invoiceId: string,
  values: Partial<{
    number: string;
    supplier: string;
    amount: string;
    issuedOn: string;
    notes: string | null;
  }>,
): Promise<void> {
  await db
    .update(invoices)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(invoices.id, invoiceId));
}

export async function payInvoice(
  db: Database,
  invoiceId: string,
  paidOn: string,
): Promise<void> {
  await db
    .update(invoices)
    .set({ status: 'paid', paidOn, updatedAt: new Date() })
    .where(eq(invoices.id, invoiceId));
}

export async function deleteInvoice(db: Database, invoiceId: string): Promise<void> {
  await db.delete(invoices).where(eq(invoices.id, invoiceId));
}
