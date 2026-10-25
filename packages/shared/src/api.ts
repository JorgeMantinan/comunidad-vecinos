import { z } from 'zod';

/** Envelope de error usado por toda la API. */
export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
});
export type ApiError = z.infer<typeof apiErrorSchema>;

export const errorCodeSchema = z.enum([
  'unauthorized',
  'forbidden',
  'not_found',
  'validation_error',
  'conflict',
  'service_unavailable',
  'internal_error',
]);
export type ErrorCode = z.infer<typeof errorCodeSchema>;
