import type { z } from 'zod';

/**
 * Valida las respuestas de la API con los contratos compartidos.
 * Ningún dato llega a la interfaz sin validar.
 */
export function validated<T>(schema: z.ZodType<T>, data: unknown): T {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new Error('La API devolvió una respuesta inesperada');
  }
  return parsed.data;
}
