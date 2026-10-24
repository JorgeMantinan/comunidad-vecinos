import { sql } from 'drizzle-orm';
import {
  check,
  date,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import type { AssessmentChargeStatus, InvoiceStatus } from '@comunidad/shared';
import { user } from './auth';
import { communities, units } from './communities';

/**
 * Facturas de proveedores: documentos recibidos, diferenciadas de los
 * gastos registrados (regla de negocio del roadmap).
 */
export const invoices = pgTable(
  'invoices',
  {
    id: text('id').primaryKey(),
    communityId: text('community_id')
      .notNull()
      .references(() => communities.id, { onDelete: 'cascade' }),
    /** Número de factura del proveedor; único por comunidad. */
    number: text('number').notNull(),
    supplier: text('supplier').notNull(),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    issuedOn: date('issued_on').notNull(),
    status: text('status').$type<InvoiceStatus>().notNull().default('received'),
    paidOn: date('paid_on'),
    notes: text('notes'),
    createdById: text('created_by_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('invoices_community_number_uq').on(t.communityId, t.number),
    index('invoices_community_issued_idx').on(t.communityId, t.issuedOn),
    check('invoices_amount_ck', sql`amount > 0`),
    check('invoices_status_ck', sql`status in ('received', 'paid')`),
    check(
      'invoices_paid_requires_date_ck',
      sql`(status = 'paid' AND paid_on IS NOT NULL) OR status = 'received'`,
    ),
  ],
);

/** Derrama: reparto de un importe total entre las unidades por coeficiente. */
export const assessments = pgTable(
  'assessments',
  {
    id: text('id').primaryKey(),
    communityId: text('community_id')
      .notNull()
      .references(() => communities.id, { onDelete: 'cascade' }),
    concept: text('concept').notNull(),
    totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).notNull(),
    createdById: text('created_by_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('assessments_community_idx').on(t.communityId, t.createdAt),
    check('assessments_total_amount_ck', sql`total_amount > 0`),
  ],
);

/** Cuota resultante de una derrama para cada unidad (importes snapshot). */
export const assessmentCharges = pgTable(
  'assessment_charges',
  {
    id: text('id').primaryKey(),
    assessmentId: text('assessment_id')
      .notNull()
      .references(() => assessments.id, { onDelete: 'cascade' }),
    communityId: text('community_id')
      .notNull()
      .references(() => communities.id, { onDelete: 'cascade' }),
    unitId: text('unit_id')
      .notNull()
      .references(() => units.id, { onDelete: 'cascade' }),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    status: text('status').$type<AssessmentChargeStatus>().notNull().default('pending'),
    paidOn: date('paid_on'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('assessment_charges_assessment_unit_uq').on(t.assessmentId, t.unitId),
    index('assessment_charges_assessment_idx').on(t.assessmentId),
    check('assessment_charges_amount_ck', sql`amount > 0`),
    check('assessment_charges_status_ck', sql`status in ('pending', 'paid')`),
    check(
      'assessment_charges_paid_requires_date_ck',
      sql`(status = 'paid' AND paid_on IS NOT NULL) OR status = 'pending'`,
    ),
  ],
);

export type Invoice = typeof invoices.$inferSelect;
export type Assessment = typeof assessments.$inferSelect;
export type AssessmentCharge = typeof assessmentCharges.$inferSelect;
