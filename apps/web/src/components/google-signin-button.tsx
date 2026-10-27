import { useHealth } from '../lib/api';
import { useGoogleLogin } from '../lib/auth';
import { Button, ErrorAlert } from './ui';

/**
 * «Continuar con Google» para iniciar sesión o crear cuenta.
 *
 * Solo se muestra si el servidor lo tiene configurado (`/api/health`
 * → `login.google`): sin credenciales el botón no aparece en lugar de
 * fallar en vano. Quien ya tenía contraseña puede entrar con Google si
 * el correo coincide (Better Auth enlaza la cuenta).
 */
export function GoogleSignInButton() {
  const health = useHealth();
  const google = useGoogleLogin();

  if (!health.data?.login.google) {
    return null;
  }

  return (
    <div className="mt-4">
      <div
        className="mb-4 flex items-center gap-3 text-xs text-subtle"
        aria-hidden="true"
      >
        <span className="h-px flex-1 bg-accent-soft" />
        <span>o</span>
        <span className="h-px flex-1 bg-accent-soft" />
      </div>
      {google.error ? <ErrorAlert message={google.error.message} /> : null}
      <Button
        type="button"
        variant="secondary"
        className="w-full"
        onClick={() => google.mutate()}
        disabled={google.isPending}
      >
        <span
          aria-hidden="true"
          className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full border border-current text-xs font-bold"
        >
          G
        </span>
        {google.isPending ? 'Abriendo Google…' : 'Continuar con Google'}
      </Button>
    </div>
  );
}
