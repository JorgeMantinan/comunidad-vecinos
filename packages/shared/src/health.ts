import { z } from 'zod';

export const healthStatusSchema = z.object({
  status: z.literal('ok'),
  version: z.string(),
  timestamp: z.iso.datetime(),
});
export type HealthStatus = z.infer<typeof healthStatusSchema>;
