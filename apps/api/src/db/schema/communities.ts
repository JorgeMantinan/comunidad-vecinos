import { sql } from 'drizzle-orm';
import {
  check,
  index,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import type { CommunityRole, InvitableRole } from '@comunidad/shared';
import { user } from './auth';

/**
 * Tablas de dominio. Todas las tablas privadas incluyen `community_id`
 * en sus claves foráneas para impedir asociaciones entre comunidades.
 */

export const communities = pgTable('communities', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  address: text('address'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const communityMemberships = pgTable(
  'community_memberships',
  {
    id: text('id').primaryKey(),
    communityId: text('community_id')
      .notNull()
      .references(() => communities.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    role: text('role').$type<CommunityRole>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('community_memberships_community_user_uq').on(t.communityId, t.userId),
    index('community_memberships_user_idx').on(t.userId),
    check(
      'community_memberships_role_ck',
      sql`role in ('owner', 'admin', 'member', 'resident')`,
    ),
  ],
);

export const units = pgTable(
  'units',
  {
    id: text('id').primaryKey(),
    communityId: text('community_id')
      .notNull()
      .references(() => communities.id, { onDelete: 'cascade' }),
    portal: text('portal'),
    number: text('number').notNull(),
    coefficient: numeric('coefficient', { precision: 10, scale: 6 })
      .notNull()
      .default('1'),
    ownerId: text('owner_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('units_community_number_uq').on(t.communityId, t.number),
    index('units_community_idx').on(t.communityId),
  ],
);

export const invitations = pgTable(
  'invitations',
  {
    id: text('id').primaryKey(),
    communityId: text('community_id')
      .notNull()
      .references(() => communities.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    role: text('role').$type<InvitableRole>().notNull(),
    /** Hash SHA-256 del token: el token en claro solo se entrega una vez. */
    tokenHash: text('token_hash').notNull().unique(),
    invitedById: text('invited_by_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    acceptedBy: text('accepted_by').references(() => user.id, {
      onDelete: 'set null',
    }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('invitations_community_idx').on(t.communityId),
    index('invitations_email_idx').on(t.email),
    check('invitations_role_ck', sql`role in ('admin', 'member', 'resident')`),
  ],
);

export const auditEvents = pgTable(
  'audit_events',
  {
    id: text('id').primaryKey(),
    communityId: text('community_id')
      .notNull()
      .references(() => communities.id, { onDelete: 'cascade' }),
    actorId: text('actor_id').references(() => user.id, {
      onDelete: 'set null',
    }),
    action: text('action').notNull(),
    targetType: text('target_type'),
    targetId: text('target_id'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    ipAddress: text('ip_address'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('audit_events_community_created_idx').on(t.communityId, t.createdAt)],
);

export type Community = typeof communities.$inferSelect;
export type Membership = typeof communityMemberships.$inferSelect;
export type Unit = typeof units.$inferSelect;
export type Invitation = typeof invitations.$inferSelect;
export type AuditEvent = typeof auditEvents.$inferSelect;
