import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import type { FeeFrequency, FeeStatus, FeeTarget } from '@comunidad/shared';
import { user } from './auth';
import { communities, units } from './communities';

/**
 * Cuotas ordinarias y tasas por anexo (garaje, trastero…).
 *
 * A diferencia de una derrama, la tarifa fija un **importe por unidad
 * y periodo**: no se reparte por coeficiente. Los cargos de cada
 * periodo se generan de forma explícita desde la interfaz (sin cron) y
 * conservan el importe y el concepto del momento del alta (snapshot).
 */
export const feeTariffs = pgTable(
  'fee_tariffs',
  {
    id: text('id').primaryKey(),
    communityId: text('community_id')
      .notNull()
      .references(() => communities.id, { onDelete: 'cascade' }),
    concept: text('concept').notNull(),
    /** Importe fijo por unidad y periodo. */
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    /** `all` o un tipo de unidad concreto. */
    target: text('target').$type<FeeTarget>().notNull().default('all'),
    frequency: text('frequency').$type<FeeFrequency>().notNull().default('monthly'),
    /** Primer periodo (AAAA-MM) al que se genera la tarifa. */
    anchorPeriod: text('anchor_period').notNull(),
    active: boolean('active').notNull().default(true),
    createdById: text('created_by_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('fee_tariffs_community_idx').on(t.communityId),
    check('fee_tariffs_amount_ck', sql`amount > 0`),
    check(
      'fee_tariffs_target_ck',
      sql`target in ('all','vivienda','garaje','trastero','local','buzon','plaza')`,
    ),
    check(
      'fee_tariffs_frequency_ck',
      sql`frequency in ('monthly','quarterly','yearly')`,
    ),
    check('fee_tariffs_anchor_ck', sql`anchor_period ~ '^\\d{4}-(0[1-9]|1[0-2])$'`),
  ],
);

/** Cargo concreto de una unidad para un periodo (snapshot). */
export const feeCharges = pgTable(
  'fee_charges',
  {
    id: text('id').primaryKey(),
    communityId: text('community_id')
      .notNull()
      .references(() => communities.id, { onDelete: 'cascade' }),
    tariffId: text('tariff_id').references(() => feeTariffs.id, {
      onDelete: 'set null',
    }),
    unitId: text('unit_id')
      .notNull()
      .references(() => units.id, { onDelete: 'cascade' }),
    /** Periodo cobrado (AAAA-MM). */
    period: text('period').notNull(),
    concept: text('concept').notNull(),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    status: text('status').$type<FeeStatus>().notNull().default('pending'),
    paidOn: date('paid_on'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('fee_charges_unit_concept_period_uq').on(
      t.communityId,
      t.unitId,
      t.concept,
      t.period,
    ),
    index('fee_charges_community_period_idx').on(t.communityId, t.period),
    index('fee_charges_unit_idx').on(t.unitId),
    check('fee_charges_amount_ck', sql`amount > 0`),
    check('fee_charges_period_ck', sql`period ~ '^\\d{4}-(0[1-9]|1[0-2])$'`),
    check('fee_charges_status_ck', sql`status in ('pending','paid')`),
    check(
      'fee_charges_paid_requires_date_ck',
      sql`(status = 'paid' AND paid_on IS NOT NULL) OR status = 'pending'`,
    ),
  ],
);

export type FeeTariff = typeof feeTariffs.$inferSelect;
export type FeeCharge = typeof feeCharges.$inferSelect;
