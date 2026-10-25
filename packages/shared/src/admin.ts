import { z } from 'zod';
import { communityIdSchema } from './communities';

/**
 * Vista agregada para el panel de administración de fincas: una fila
 * por comunidad donde el usuario es `owner` o `admin`. Solo consulta
 * comunidades autorizadas; nunca existe una vista global.
 */
export const adminCommunitySummarySchema = z.object({
  id: communityIdSchema,
  name: z.string(),
  address: z.string().nullable(),
  role: z.enum(['owner', 'admin']),
  metrics: z.object({
    members: z.number().int().min(0),
    openIncidents: z.number().int().min(0),
    openTasks: z.number().int().min(0),
    pendingInvitations: z.number().int().min(0),
    contractsRenewingSoon: z.number().int().min(0),
    /** Gasto pendiente de pago (decimal exacto en euros). */
    unpaidExpenses: z.string(),
  }),
});
export type AdminCommunitySummary = z.infer<typeof adminCommunitySummarySchema>;

export const adminOverviewSchema = z.array(adminCommunitySummarySchema);

/**
 * Métricas de cuota para la administración de plataforma: agregados
 * globales de la base de datos (sin IA, sin proveedores externos).
 */
export const platformMetricsSchema = z.object({
  users: z.number().int().min(0),
  communities: z.number().int().min(0),
  memberships: z.number().int().min(0),
  activeSessions: z.number().int().min(0),
  pendingInvitations: z.number().int().min(0),
  auditEvents: z.number().int().min(0),
  /** Bytes de documentos y fotos declarados en la base de datos. */
  storedBytes: z.number().int().min(0),
});
export type PlatformMetrics = z.infer<typeof platformMetricsSchema>;
