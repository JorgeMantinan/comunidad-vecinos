import { z } from 'zod';

export const healthStatusSchema = z.object({
  status: z.literal('ok'),
  version: z.string(),
  timestamp: z.iso.datetime(),
  /**
   * Proveedores de acceso social habilitados. La interfaz solo muestra
   * el botón de Google si el servidor lo tiene configurado.
   */
  login: z.object({
    google: z.boolean(),
  }),
});
export type HealthStatus = z.infer<typeof healthStatusSchema>;
