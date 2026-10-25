import { sql } from 'drizzle-orm';
import {
  check,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import type {
  IncidentStatus,
  PollStatus,
  SuggestionStatus,
  TaskRecurrence,
  TaskStatus,
} from '@comunidad/shared';
import { user } from './auth';
import { communities } from './communities';
import { agreements } from './management';

/** Incidencias/averías: cualquier miembro puede reportarlas. */
export const incidents = pgTable(
  'incidents',
  {
    id: text('id').primaryKey(),
    communityId: text('community_id')
      .notNull()
      .references(() => communities.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description').notNull(),
    status: text('status').$type<IncidentStatus>().notNull().default('open'),
    reportedById: text('reported_by_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('incidents_community_status_idx').on(t.communityId, t.status),
    check('incidents_status_ck', sql`status in ('open', 'in_progress', 'resolved')`),
    // Solo las resoluciones llevan fecha; al reabrir se limpia.
    check(
      'incidents_resolved_requires_date_ck',
      sql`(status = 'resolved' AND resolved_at IS NOT NULL) OR status <> 'resolved'`,
    ),
  ],
);

/** Tareas con responsable (miembro) y vencimiento opcionales. */
export const tasks = pgTable(
  'tasks',
  {
    id: text('id').primaryKey(),
    communityId: text('community_id')
      .notNull()
      .references(() => communities.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    dueOn: date('due_on'),
    assigneeId: text('assignee_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    status: text('status').$type<TaskStatus>().notNull().default('todo'),
    /** Acuerdo del que deriva la tarea (seguimiento de acuerdos). */
    agreementId: text('agreement_id').references(() => agreements.id, {
      onDelete: 'set null',
    }),
    /**
     * Proceso repetitivo: al marcar la tarea como hecha nace la
     * siguiente ocurrencia (sin cron: determinista y auditable).
     */
    recurrence: text('recurrence').$type<TaskRecurrence>(),
    createdById: text('created_by_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('tasks_community_due_idx').on(t.communityId, t.dueOn),
    index('tasks_agreement_idx').on(t.agreementId),
    check('tasks_status_ck', sql`status in ('todo', 'doing', 'done')`),
    check(
      'tasks_recurrence_ck',
      sql`recurrence is null or recurrence in ('monthly', 'quarterly', 'yearly')`,
    ),
  ],
);

/** Sugerencias de cualquier miembro, con estado revisado por la junta. */
export const suggestions = pgTable(
  'suggestions',
  {
    id: text('id').primaryKey(),
    communityId: text('community_id')
      .notNull()
      .references(() => communities.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    body: text('body').notNull(),
    status: text('status').$type<SuggestionStatus>().notNull().default('open'),
    authorId: text('author_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('suggestions_community_status_idx').on(t.communityId, t.status),
    check(
      'suggestions_status_ck',
      sql`status in ('open', 'under_review', 'accepted', 'rejected')`,
    ),
  ],
);

/** Encuestas informales (no vinculantes) con una opción por voto. */
export const polls = pgTable(
  'polls',
  {
    id: text('id').primaryKey(),
    communityId: text('community_id')
      .notNull()
      .references(() => communities.id, { onDelete: 'cascade' }),
    question: text('question').notNull(),
    status: text('status').$type<PollStatus>().notNull().default('open'),
    closesOn: timestamp('closes_on', { withTimezone: true }),
    createdById: text('created_by_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('polls_community_status_idx').on(t.communityId, t.status),
    check('polls_status_ck', sql`status in ('open', 'closed')`),
  ],
);

export const pollOptions = pgTable(
  'poll_options',
  {
    id: text('id').primaryKey(),
    pollId: text('poll_id')
      .notNull()
      .references(() => polls.id, { onDelete: 'cascade' }),
    communityId: text('community_id')
      .notNull()
      .references(() => communities.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    text: text('text').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('poll_options_poll_position_uq').on(t.pollId, t.position),
    index('poll_options_poll_idx').on(t.pollId),
  ],
);

export const pollVotes = pgTable(
  'poll_votes',
  {
    id: text('id').primaryKey(),
    pollId: text('poll_id')
      .notNull()
      .references(() => polls.id, { onDelete: 'cascade' }),
    communityId: text('community_id')
      .notNull()
      .references(() => communities.id, { onDelete: 'cascade' }),
    optionId: text('option_id')
      .notNull()
      .references(() => pollOptions.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Un voto por miembro y encuesta.
    uniqueIndex('poll_votes_poll_user_uq').on(t.pollId, t.userId),
    index('poll_votes_option_idx').on(t.optionId),
  ],
);

export type Incident = typeof incidents.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type Suggestion = typeof suggestions.$inferSelect;
export type Poll = typeof polls.$inferSelect;
export type PollOption = typeof pollOptions.$inferSelect;
export type PollVote = typeof pollVotes.$inferSelect;
