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
