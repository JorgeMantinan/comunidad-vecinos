import type { CommunityRole } from '@comunidad/shared';
import type { MiddlewareHandler } from 'hono';
import { findMembership } from '../modules/communities/repository';
import type { Database } from '../db/client';
import type { AppEnv } from '../lib/context';
import { forbidden, notFound } from '../lib/errors';

/**
 * Segunda barrera de autorización: resuelve la membresía del usuario en
 * la comunidad de la ruta (`:id`) y exige uno de los roles permitidos.
 *
 * Si el usuario no es miembro responde 404 (no revela si la comunidad
 * existe). Si es miembro pero con rol insuficiente, responde 403.
 */
export function requireCommunityRole(
  db: Database,
  allowedRoles: readonly CommunityRole[],
): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const communityId = c.req.param('id');
    if (!communityId) {
      throw notFound('Comunidad no encontrada');
    }

    const membership = await findMembership(db, c.get('user').id, communityId);
    if (!membership) {
      throw notFound('Comunidad no encontrada');
    }
    if (!allowedRoles.includes(membership.role)) {
      throw forbidden();
    }

    c.set('membership', membership);
    await next();
  };
}

/** Cualquier miembro de la comunidad. */
export const anyMemberRoles = [
  'owner',
  'admin',
  'member',
  'resident',
] as const satisfies readonly CommunityRole[];

/** Roles con capacidad de administración (invitaciones, miembros, auditoría). */
export const adminRoles = [
  'owner',
  'admin',
] as const satisfies readonly CommunityRole[];
