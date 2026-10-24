import { z } from 'zod';

/** Roles posibles dentro de una comunidad. */
export const communityRoleSchema = z.enum(['owner', 'admin', 'member', 'resident']);
export type CommunityRole = z.infer<typeof communityRoleSchema>;

/** Roles que una invitación puede asignar (nunca `owner`). */
export const invitableRoleSchema = z.enum(['admin', 'member', 'resident']);
export type InvitableRole = z.infer<typeof invitableRoleSchema>;

/**
 * Poder de gestión sobre otros miembros según la matriz de permisos.
 * `owner` gestiona a todos; `admin` solo a `member` y `resident`.
 */
export function canManageRole(
  actorRole: CommunityRole,
  targetRole: CommunityRole,
): boolean {
  if (actorRole === 'owner') return true;
  if (actorRole === 'admin')
    return targetRole === 'member' || targetRole === 'resident';
  return false;
}
