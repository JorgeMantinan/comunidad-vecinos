import { z } from 'zod';

/**
 * Estadísticas de uso de la comunidad: agregaciones SQL directas
 * (decisión ADR 006: sin IA, sin proveedores externos, sin coste por
 * consulta).
 */
export const communityStatsSchema = z.object({
  members: z.number().int().min(0),
  units: z.number().int().min(0),
  announcements: z.number().int().min(0),
  meetings: z.number().int().min(0),
  suggestions: z.number().int().min(0),
  professionals: z.number().int().min(0),
  documents: z.number().int().min(0),
  templates: z.number().int().min(0),
  assessments: z.number().int().min(0),
  incidents: z.object({
    total: z.number().int().min(0),
    open: z.number().int().min(0),
  }),
  tasks: z.object({
    total: z.number().int().min(0),
    done: z.number().int().min(0),
  }),
  expenses: z.object({
    count: z.number().int().min(0),
    total: z.string(),
    paidTotal: z.string(),
  }),
  invoices: z.object({
    count: z.number().int().min(0),
    total: z.string(),
  }),
  /** Acciones registradas en auditoría en los últimos 30 días. */
  recentActivity: z.number().int().min(0),
});
export type CommunityStats = z.infer<typeof communityStatsSchema>;
