import type { ErrorCode } from '@comunidad/shared';

/** Error de aplicación traducido a una respuesta HTTP por el manejador. */
export class AppError extends Error {
  readonly status: number;
  readonly code: ErrorCode;

  constructor(status: number, code: ErrorCode, message: string) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
  }
}

export const unauthorized = (message = 'No autenticado') =>
  new AppError(401, 'unauthorized', message);

export const forbidden = (message = 'No tienes permisos para esta operación') =>
  new AppError(403, 'forbidden', message);

export const notFound = (message = 'Recurso no encontrado') =>
  new AppError(404, 'not_found', message);

export const conflict = (message: string) => new AppError(409, 'conflict', message);

export const validationError = (message: string) =>
  new AppError(400, 'validation_error', message);
