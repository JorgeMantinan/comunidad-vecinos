import { randomUUID } from 'node:crypto';

/**
 * Genera un identificador con prefijo de recurso, por ejemplo
 * `cm_9f2c...`. El sufijo es un UUID sin guiones (32 caracteres hex).
 */
export function newId(prefix: string): string {
  return `${prefix}_${randomUUID().replaceAll('-', '')}`;
}
