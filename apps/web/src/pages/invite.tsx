import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button, Card, ErrorAlert, Spinner } from '../components/ui';
import { useAcceptInvitation } from '../lib/api';

/** Página del enlace de invitación: /invite/:token */
export function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const accept = useAcceptInvitation();

  return (
    <div className="mx-auto max-w-md">
      <Card title="Invitación a una comunidad">
        {accept.error ? <ErrorAlert message={accept.error.message} /> : null}

        {accept.data ? (
          <div>
            <p className="mb-4 text-neutral-700">
              Ya formas parte de{' '}
              <strong className="text-primary">{accept.data.communityName}</strong>.
            </p>
            <Button onClick={() => navigate(`/communities/${accept.data.communityId}`)}>
              Ir a la comunidad
            </Button>
          </div>
        ) : (
          <div>
            <p className="mb-4 text-neutral-700">
              Acepta la invitación para unirte a la comunidad. Si no esperabas esta
              invitación, puedes ignorarla.
            </p>
            {accept.isPending ? <Spinner /> : null}
            <div className="flex gap-3">
              <Button
                onClick={() => accept.mutate(token ?? '')}
                disabled={!token || accept.isPending}
              >
                {accept.isPending ? 'Aceptando…' : 'Aceptar invitación'}
              </Button>
              <Link to="/">
                <Button variant="ghost">Ahora no</Button>
              </Link>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
