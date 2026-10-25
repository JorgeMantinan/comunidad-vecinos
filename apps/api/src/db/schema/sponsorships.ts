import {
  index,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import type { SponsorshipStatus } from '@comunidad/shared';
import { user } from './auth';
import { communities } from './communities';

/**
 * Patrocinios (publicidad) gestionados a nivel de plataforma.
 *
 * Reglas (ver `docs/privacy-and-retention.md`):
 * - Identificación obligatoria como publicidad en la interfaz.
 * - El patrocinador NO es usuario: no accede a ningún dato de la
 *   comunidad ni a quién solicita servicios.
 * - Nunca se mezclan con las recomendaciones vecinales de
 *   `professionals`.
 */
export const sponsorships = pgTable('sponsorships', {
  id: text('id').primaryKey(),
  businessName: text('business_name').notNull(),
  website: text('website'),
  contactEmail: text('contact_email'),
  /** Zona del anunciante (ciudad o barrio) para mostrar por cercanía. */
  zone: text('zone'),
  /** Importe mensual acordado (solo visible para la plataforma). */
  monthlyAmount: numeric('monthly_amount', { precision: 10, scale: 2 }),
  status: text('status').$type<SponsorshipStatus>().notNull().default('pending'),
  notes: text('notes'),
  createdById: text('created_by_id').references(() => user.id, {
    onDelete: 'set null',
  }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Comunidades donde se muestra cada patrocinio. */
export const sponsorshipCommunities = pgTable(
  'sponsorship_communities',
  {
    sponsorshipId: text('sponsorship_id')
      .notNull()
      .references(() => sponsorships.id, { onDelete: 'cascade' }),
    communityId: text('community_id')
      .notNull()
      .references(() => communities.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Una asignación única por pareja patrocinio↔comunidad.
    primaryKey({
      name: 'sponsorship_communities_pk',
      columns: [t.sponsorshipId, t.communityId],
    }),
    index('sponsorship_communities_sponsorship_idx').on(t.sponsorshipId),
    index('sponsorship_communities_community_idx').on(t.communityId),
  ],
);

export type Sponsorship = typeof sponsorships.$inferSelect;
export type SponsorshipCommunity = typeof sponsorshipCommunities.$inferSelect;
