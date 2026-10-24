import type { Context } from 'hono';
import type { z } from 'zod';
import { validationError } from './errors';

/** Convierte el error de Zod en un mensaje legible para la API. */
function describeZodError(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.join('.');
      return path ? `${path}: ${issue.message}` : issue.message;
    })
    .join('; ');
}

/** Valida el cuerpo JSON de la petición contra un esquema de entrada. */
export async function jsonBody<S extends z.ZodType>(
  schema: S,
  c: Context,
): Promise<z.output<S>> {
  const raw: unknown = await c.req.json().catch(() => {
    throw validationError('El cuerpo debe ser JSON válido');
  });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw validationError(describeZodError(parsed.error));
  }
  return parsed.data;
}

/** Valida los parámetros de ruta (siempre strings) contra un esquema. */
export function pathParams<S extends z.ZodType>(
  schema: S,
  params: Record<string, string>,
): z.output<S> {
  const parsed = schema.safeParse(params);
  if (!parsed.success) {
    throw validationError(describeZodError(parsed.error));
  }
  return parsed.data;
}

/** Serializa una fecha como ISO 8601 para las respuestas de la API. */
export const toIso = (date: Date): string => date.toISOString();

export const toIsoOrNull = (date: Date | null): string | null =>
  date ? date.toISOString() : null;
