import type { ErrorHandler, NotFoundHandler } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { AppError } from '../lib/errors';

/**
 * Traduce los errores a respuestas JSON estables `{ code, message }`.
 * Los errores inesperados se registran y se ocultan al cliente.
 */
export const errorHandler: ErrorHandler = (error, c) => {
  if (error instanceof AppError) {
    return c.json(
      { code: error.code, message: error.message },
      error.status as ContentfulStatusCode,
    );
  }
  console.error(error);
  return c.json({ code: 'internal_error', message: 'Error interno del servidor' }, 500);
};

export const notFoundHandler: NotFoundHandler = (c) =>
  c.json({ code: 'not_found', message: 'Ruta no encontrada' }, 404);
