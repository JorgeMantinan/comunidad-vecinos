import type { CommunityRole } from '@comunidad/shared';
import { Card, ErrorAlert, Spinner } from '../../components/ui';
import { useCommunitySponsors } from './api';

/**
 * Publicidad de la comunidad: SIEMPRE identificada como tal. Los
 * patrocinadores no son usuarios y no reciben ningún dato de la
 * comunidad (ver ADR/privacidad).
 */
export function SponsorsCard({
  communityId,
  role,
}: {
  communityId: string;
  role: CommunityRole;
}) {
  const sponsors = useCommunitySponsors(communityId);

  if (sponsors.error) {
    return (
      <Card title="Colaboradores">
        <ErrorAlert message={sponsors.error.message} />
      </Card>
    );
  }
  if (sponsors.isLoading) {
    return (
      <Card title="Colaboradores">
        <Spinner />
      </Card>
    );
  }
  if (!sponsors.data || sponsors.data.length === 0) {
    return null;
  }
  void role;

  return (
    <Card title="Colaboradores">
      <p className="mb-3 rounded-lg bg-accent-soft px-3 py-2 text-xs text-primary">
        <strong>Publicidad:</strong> espacios pagados por negocios locales. Quienes
        anuncian no acceden a los datos de la comunidad.
      </p>
      <ul className="grid gap-3 md:grid-cols-2">
        {sponsors.data.map((sponsor) => (
          <li key={sponsor.id} className="rounded-lg border border-accent p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium text-body">{sponsor.businessName}</p>
              <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                Publicidad
              </span>
            </div>
            {sponsor.website ? (
              <a
                href={sponsor.website}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className="mt-1 inline-block text-sm text-primary underline"
              >
                Visitar sitio
              </a>
            ) : null}
          </li>
        ))}
      </ul>
    </Card>
  );
}
