import { sql } from 'drizzle-orm';
import {
  check,
  date,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import type { AssetCategory, AssetStatus, ContractStatus } from '@comunidad/shared';
import { user } from './auth';
import { communities } from './communities';

/** Inventario de elementos comunes de la comunidad. */
export const assets = pgTable(
  'assets',
  {
    id: text('id').primaryKey(),
    communityId: text('community_id')
      .notNull()
      .references(() => communities.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    category: text('category').$type<AssetCategory>().notNull(),
    location: text('location'),
    status: text('status').$type<AssetStatus>().notNull().default('operational'),
    /** Fin de garantía opcional (fecha de revisión del mantenimiento). */
    warrantyUntil: date('warranty_until'),
    notes: text('notes'),
    createdById: text('created_by_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('assets_community_category_idx').on(t.communityId, t.category),
    check(
      'assets_category_ck',
      sql`category in ('elevator', 'plumbing', 'electrical', 'heating', 'common_area', 'other')`,
    ),
    check('assets_status_ck', sql`status in ('operational', 'maintenance', 'broken')`),
  ],
);

/** Contratos de mantenimiento/preventivo con fecha de renovación. */
export const maintenanceContracts = pgTable(
  'maintenance_contracts',
  {
    id: text('id').primaryKey(),
    communityId: text('community_id')
      .notNull()
      .references(() => communities.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(),
    service: text('service').notNull(),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    startOn: date('start_on').notNull(),
    renewalOn: date('renewal_on').notNull(),
    status: text('status').$type<ContractStatus>().notNull().default('active'),
    notes: text('notes'),
    createdById: text('created_by_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('maintenance_contracts_community_status_idx').on(t.communityId, t.status),
    check('maintenance_contracts_amount_ck', sql`amount > 0`),
    check('maintenance_contracts_dates_ck', sql`renewal_on >= start_on`),
    check('maintenance_contracts_status_ck', sql`status in ('active', 'ended')`),
  ],
);

/**
 * Profesionales recomendados por la comunidad. La recomendación vecinal
 * se distingue de la publicidad patrocinada: los patrocinios llegan en
 * la Fase 5 como entidad separada (`sponsorships`).
 */
export const professionals = pgTable(
  'professionals',
  {
    id: text('id').primaryKey(),
    communityId: text('community_id')
      .notNull()
      .references(() => communities.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    trade: text('trade').notNull(),
    phone: text('phone'),
    email: text('email'),
    notes: text('notes'),
    recommendedById: text('recommended_by_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('professionals_community_trade_idx').on(t.communityId, t.trade)],
);

export type Asset = typeof assets.$inferSelect;
export type MaintenanceContract = typeof maintenanceContracts.$inferSelect;
export type Professional = typeof professionals.$inferSelect;
