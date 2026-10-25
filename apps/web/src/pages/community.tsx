import { Link, useParams } from 'react-router-dom';
import { Button, ErrorAlert, RoleBadge, Spinner } from '../components/ui';
import { useExportCommunity } from '../features/export/api';
import { SponsorsCard } from '../features/sponsorships/sponsors-card';
import { useCommunity } from '../lib/api';

interface Tile {
  slug: string;
  icon: string;
  title: string;
  subtitle: string;
  /** Solo owner/admin (economía y documentación). */
  adminOnly?: boolean;
}

/** Menú principal de la comunidad: botones grandes y títulos llanos. */
const TILES: Tile[] = [
  { slug: 'avisos', icon: '📢', title: 'Avisos', subtitle: 'Lo que publica la junta' },
  {
    slug: 'reuniones',
    icon: '📅',
    title: 'Reuniones',
    subtitle: 'Convocatorias, actas y acuerdos',
  },
  {
    slug: 'incidencias',
    icon: '🔧',
    title: 'Incidencias',
    subtitle: 'Averías: ver las que hay y avisar de nuevas',
  },
  {
    slug: 'mantenimiento',
    icon: '🏗️',
    title: 'Mantenimiento',
    subtitle: 'Elementos del edificio y contratos',
  },
  { slug: 'tareas', icon: '✅', title: 'Tareas', subtitle: 'Qué hay que hacer' },
  {
    slug: 'economia',
    icon: '💶',
    title: 'El dinero de la comunidad',
    subtitle: 'Gastos, facturas, derramas y cuotas',
    adminOnly: true,
  },
  {
    slug: 'documentos',
    icon: '📄',
    title: 'Documentos',
    subtitle: 'Actas, contratos y modelos',
    adminOnly: true,
  },
  {
    slug: 'vecinos',
    icon: '👥',
    title: 'Vecinos',
    subtitle: 'Quiénes forman la comunidad',
  },
  {
    slug: 'participacion',
    icon: '💡',
    title: 'Ideas y encuestas',
    subtitle: 'Proponer y votar',
  },
  {
    slug: 'profesionales',
    icon: '🧰',
    title: 'Profesionales',
    subtitle: 'Recomendados por tus vecinos',
  },
];

export function CommunityPage() {
  const { id } = useParams<{ id: string }>();
  const community = useCommunity(id);

  if (community.isLoading) {
    return (
      <div className="flex justify-center">
        <Spinner />
      </div>
    );
  }
  if (community.error || !community.data) {
    return (
      <ErrorAlert message={community.error?.message ?? 'Comunidad no encontrada'} />
    );
  }

  const { id: communityId, role } = community.data;
  const isResident = role === 'resident';

  return (
    <div className="space-y-6">
      <header>
        <Link to="/" className="text-lg font-medium text-primary">
          ← Mis comunidades
        </Link>
        <div className="mt-2 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-primary">{community.data.name}</h1>
            <p className="text-neutral-600">
              {community.data.address ?? 'Sin dirección registrada'}
            </p>
          </div>
          <RoleBadge role={role} />
        </div>
      </header>

      <nav
        aria-label="Apartados de la comunidad"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        {TILES.filter((tile) => !(tile.adminOnly && isResident)).map((tile) => (
          <Link
            key={tile.slug}
            to={`/communities/${communityId}/${tile.slug}`}
            className="flex items-start gap-4 rounded-2xl border border-accent bg-white p-6 shadow-sm transition hover:border-primary hover:shadow-md"
          >
            <span className="text-4xl" aria-hidden="true">
              {tile.icon}
            </span>
            <span>
              <span className="block text-xl font-bold text-primary">{tile.title}</span>
              <span className="mt-1 block text-sm text-neutral-600">
                {tile.subtitle}
              </span>
            </span>
          </Link>
        ))}
      </nav>

      <div className="flex flex-wrap items-center gap-4">
        <Link to={`/communities/${communityId}/estadisticas`}>
          <Button variant="secondary">📊 Ver números de la comunidad</Button>
        </Link>
        <ExportButton
          communityId={communityId}
          canExport={role === 'owner' || role === 'admin'}
        />
      </div>

      <SponsorsCard communityId={communityId} role={role} />
    </div>
  );
}

/** Descarga JSON con todos los datos de la comunidad (owner/admin). */
function ExportButton({
  communityId,
  canExport,
}: {
  communityId: string;
  canExport: boolean;
}) {
  const exportCommunity = useExportCommunity(communityId);
  if (!canExport) {
    return null;
  }
  return (
    <>
      {exportCommunity.error ? (
        <ErrorAlert message={exportCommunity.error.message} />
      ) : null}
      <Button
        variant="secondary"
        onClick={() => exportCommunity.mutate()}
        disabled={exportCommunity.isPending}
        title="Descarga un JSON con los datos de la comunidad"
      >
        {exportCommunity.isPending ? 'Exportando…' : '⬇️ Exportar datos'}
      </Button>
    </>
  );
}
