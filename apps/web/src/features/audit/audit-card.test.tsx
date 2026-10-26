import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuditCard } from './audit-card';

const COMMUNITY_ID = 'cm_0123456789abcdef0123456789abcdef';

const events = [
  {
    id: 'ae_1',
    action: 'announcement.created',
    actorId: null,
    targetType: 'announcement',
    targetId: 'an_1',
    metadata: {},
    ipAddress: null,
    createdAt: '2026-10-26T10:00:00.000Z',
  },
  {
    id: 'ae_2',
    action: 'accion.sin.etiqueta',
    actorId: null,
    targetType: null,
    targetId: null,
    metadata: {},
    ipAddress: null,
    createdAt: '2026-10-26T11:00:00.000Z',
  },
];

function renderCard(role: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify(events), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  );

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AuditCard communityId={COMMUNITY_ID} role={role} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { fetchMock };
}

describe('AuditCard', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('muestra la actividad traducida y conserva el código en el título', async () => {
    const { fetchMock } = renderCard('owner');

    const label = await screen.findByText('Aviso publicado');
    expect(label.getAttribute('title')).toBe('announcement.created');
    // Una acción desconocida se ve entera: no se pierde información.
    expect(screen.getByText('accion.sin.etiqueta')).toBeTruthy();
    expect(fetchMock.mock.calls[0]?.[0]?.toString()).toContain(
      '/audit-events?limit=20',
    );
  });

  it('no se muestra a propietarios ni a residentes', () => {
    renderCard('member');
    expect(screen.queryByText('Actividad reciente')).toBeNull();
    expect(screen.queryByText('Aviso publicado')).toBeNull();

    cleanup();
    renderCard('resident');
    expect(screen.queryByText('Actividad reciente')).toBeNull();
  });

  it('el propietario no llega a pedir la auditoría a la API', () => {
    const { fetchMock } = renderCard('member');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
