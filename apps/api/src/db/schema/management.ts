import { sql } from 'drizzle-orm';
import {
  check,
  date,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import type {
  AgreementStatus,
  ExpenseCategory,
  ExpenseStatus,
  MeetingStatus,
} from '@comunidad/shared';
import { user } from './auth';
import { communities } from './communities';

/** Convocatorias de junta/reunión con orden del día, acta y acuerdos. */
export const meetings = pgTable(
  'meetings',
  {
    id: text('id').primaryKey(),
    communityId: text('community_id')
      .notNull()
      .references(() => communities.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    scheduledFor: timestamp('scheduled_for', { withTimezone: true }).notNull(),
    location: text('location'),
    status: text('status').$type<MeetingStatus>().notNull().default('planned'),
    /** Acta de la reunión (texto libre); se completa al finalizar. */
    minutes: text('minutes'),
    createdById: text('created_by_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('meetings_community_scheduled_idx').on(t.communityId, t.scheduledFor),
    check('meetings_status_ck', sql`status in ('planned', 'finished', 'cancelled')`),
  ],
);

export const meetingAgendaItems = pgTable(
  'meeting_agenda_items',
  {
    id: text('id').primaryKey(),
    meetingId: text('meeting_id')
      .notNull()
      .references(() => meetings.id, { onDelete: 'cascade' }),
    /** redundante con la del meeting: permite filtrar sin join. */
    communityId: text('community_id')
      .notNull()
      .references(() => communities.id, { onDelete: 'cascade' }),
    position: integer('position').notNull().default(0),
    title: text('title').notNull(),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('meeting_agenda_meeting_position_idx').on(t.meetingId, t.position)],
);

export const agreements = pgTable(
  'agreements',
  {
    id: text('id').primaryKey(),
    communityId: text('community_id')
      .notNull()
      .references(() => communities.id, { onDelete: 'cascade' }),
    meetingId: text('meeting_id')
      .notNull()
      .references(() => meetings.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    body: text('body').notNull(),
    status: text('status').$type<AgreementStatus>().notNull().default('proposed'),
    createdById: text('created_by_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('agreements_community_status_idx').on(t.communityId, t.status),
    check('agreements_status_ck', sql`status in ('proposed', 'approved', 'rejected')`),
  ],
);

/** Gastos comunes con estados diferenciados (registrado / pagado). */
export const expenses = pgTable(
  'expenses',
  {
    id: text('id').primaryKey(),
    communityId: text('community_id')
      .notNull()
      .references(() => communities.id, { onDelete: 'cascade' }),
    concept: text('concept').notNull(),
    /** Decimal exacto (ej. '125.40'); nunca float. */
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    category: text('category').$type<ExpenseCategory>().notNull(),
    incurredOn: date('incurred_on').notNull(),
    status: text('status').$type<ExpenseStatus>().notNull().default('registered'),
    paidOn: date('paid_on'),
    createdById: text('created_by_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('expenses_community_incurred_idx').on(t.communityId, t.incurredOn),
    check('expenses_amount_ck', sql`amount > 0`),
    check('expenses_status_ck', sql`status in ('registered', 'paid')`),
    // Un gasto pagado debe registrar su fecha de pago.
    check(
      'expenses_paid_requires_date_ck',
      sql`(status = 'paid' AND paid_on IS NOT NULL) OR status = 'registered'`,
    ),
    check(
      'expenses_category_ck',
      sql`category in ('community', 'administration', 'repair', 'supply', 'other')`,
    ),
  ],
);

export type Meeting = typeof meetings.$inferSelect;
export type MeetingAgendaItem = typeof meetingAgendaItems.$inferSelect;
export type Agreement = typeof agreements.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
