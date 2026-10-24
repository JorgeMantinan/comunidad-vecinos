import type { CreateInvoiceInput, UpdateInvoiceInput } from '@comunidad/shared';
import { recordAuditEvent } from '../../lib/audit';
import type { Database } from '../../db/client';
import { conflict, notFound } from '../../lib/errors';
import * as repo from './repository';
import type { InvoiceRow } from './repository';

export interface Actor {
  id: string;
}

const todayIsoDate = (): string => new Date().toISOString().slice(0, 10);

export async function registerInvoice(
  db: Database,
  actor: Actor,
  communityId: string,
  input: CreateInvoiceInput,
): Promise<InvoiceRow> {
  const existing = await repo.findInvoiceByNumber(db, communityId, input.number);
  if (existing) {
    throw conflict(`Ya existe una factura con el número "${input.number}"`);
  }

  const invoice = await repo.createInvoice(db, {
    communityId,
    number: input.number,
    supplier: input.supplier,
    amount: input.amount,
    issuedOn: input.issuedOn,
    notes: input.notes ?? null,
    createdById: actor.id,
  });

  await recordAuditEvent(db, {
    communityId,
    actorId: actor.id,
    action: 'invoice.created',
    targetType: 'invoice',
    targetId: invoice.id,
    metadata: {
      number: invoice.number,
      supplier: invoice.supplier,
      amount: invoice.amount,
    },
  });

  return invoice;
}

export async function editInvoice(
  db: Database,
  actor: Actor,
  communityId: string,
  invoiceId: string,
  input: UpdateInvoiceInput,
): Promise<void> {
  const existing = await repo.findInvoiceById(db, communityId, invoiceId);
  if (!existing) {
    throw notFound('Factura no encontrada');
  }

  const values: Parameters<typeof repo.updateInvoice>[2] = {};
  if (input.number !== undefined && input.number !== existing.number) {
    const duplicated = await repo.findInvoiceByNumber(db, communityId, input.number);
    if (duplicated) {
      throw conflict(`Ya existe una factura con el número "${input.number}"`);
    }
    values.number = input.number;
  }
  if (input.supplier !== undefined) values.supplier = input.supplier;
  if (input.amount !== undefined) values.amount = input.amount;
  if (input.issuedOn !== undefined) values.issuedOn = input.issuedOn;
  if (input.notes !== undefined) values.notes = input.notes;
  if (Object.keys(values).length === 0) {
    return;
  }

  await repo.updateInvoice(db, invoiceId, values);
  await recordAuditEvent(db, {
    communityId,
    actorId: actor.id,
    action: 'invoice.updated',
    targetType: 'invoice',
    targetId: invoiceId,
    metadata: { fields: Object.keys(values) },
  });
}

export async function markInvoicePaid(
  db: Database,
  actor: Actor,
  communityId: string,
  invoiceId: string,
  input: { paidOn?: string },
): Promise<void> {
  const existing = await repo.findInvoiceById(db, communityId, invoiceId);
  if (!existing) {
    throw notFound('Factura no encontrada');
  }
  if (existing.status === 'paid') {
    throw conflict('La factura ya está pagada');
  }

  const paidOn = input.paidOn ?? todayIsoDate();
  await repo.payInvoice(db, invoiceId, paidOn);
  await recordAuditEvent(db, {
    communityId,
    actorId: actor.id,
    action: 'invoice.paid',
    targetType: 'invoice',
    targetId: invoiceId,
    metadata: { number: existing.number, amount: existing.amount, paidOn },
  });
}

export async function removeInvoice(
  db: Database,
  actor: Actor,
  communityId: string,
  invoiceId: string,
): Promise<void> {
  const existing = await repo.findInvoiceById(db, communityId, invoiceId);
  if (!existing) {
    throw notFound('Factura no encontrada');
  }

  await repo.deleteInvoice(db, invoiceId);
  await recordAuditEvent(db, {
    communityId,
    actorId: actor.id,
    action: 'invoice.deleted',
    targetType: 'invoice',
    targetId: invoiceId,
    metadata: { number: existing.number },
  });
}
