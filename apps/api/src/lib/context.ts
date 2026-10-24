import type { Auth } from './auth';
import type { Membership } from '../db/schema';

type SessionResult = NonNullable<Awaited<ReturnType<Auth['api']['getSession']>>>;

/**
 * Variables tipadas del contexto de Hono. Se rellenan en los middleware:
 * `requireAuth` coloca usuario y sesión; `requireCommunityRole`, la
 * membresía autorizada.
 */
export interface AppVariables {
  user: SessionResult['user'];
  session: SessionResult['session'];
  membership: Membership;
}

/** Forma del `Env` de Hono con nuestras variables tipadas. */
export interface AppEnv {
  Variables: AppVariables;
}
