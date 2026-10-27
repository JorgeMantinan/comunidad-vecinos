import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminOverviewCard } from './admin-overview-card';

const COMMUNITY_ID = 'cm_0123456789abcdef0123456789abcdef';

const overview = [
  {
    id: COMMUNITY_ID,
    name: 'Comunidad Calle Mayor 12',
    address: 'Calle Mayor 12, Madrid',
    role: 'owner' as const,
    metrics: {
      members: 4,
      openIncidents: 2,
      openTasks: 3,
      pendingInvitations: 1,
      contractsRenewingSoon: 2,
      unpaidExpenses: '1234.50',
    },
  },
];

function renderCard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify(overview), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  );

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<AdminOverviewCard />} />
          <Route path="/communities/:id" element={<p>DESTINO</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('AdminOverviewCard', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('al pulsar cualquier fila se entra en la comunidad', async () => {
    renderCard();

    const name = await screen.findByText('Comunidad Calle Mayor 12');
    fireEvent.click(name.closest('tr') as HTMLElement);

    expect(await screen.findByText('DESTINO')).toBeTruthy();
  });

  it('muestra el importe sin botón lateral (la fila ya es el acceso)', async () => {
    renderCard();

    // El importe se formatea con Intl (p. ej. «1234,50 €»): se busca
    // por la parte numérica para no depender del separador.
    expect(await screen.findByText(/234,50/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Gestionar' })).toBeNull();
    // El nombre sigue siendo un enlace real: accesible por teclado.
    expect(screen.getByRole('link', { name: 'Comunidad Calle Mayor 12' })).toBeTruthy();
  });
});
