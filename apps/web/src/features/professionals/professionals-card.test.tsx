import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProfessionalsCard } from './professionals-card';

function setNativeValue(element: HTMLInputElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value',
  )?.set;
  setter?.call(element, value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
}

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

const COMMUNITY_ID = 'cm_0123456789abcdef0123456789abcdef';

interface Options {
  role: 'member' | 'owner';
  suggestions?: unknown[];
}

function renderCard({ role, suggestions = [] }: Options) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const calls: { url: string; method: string; body?: unknown }[] = [];

  vi.spyOn(globalThis, 'fetch').mockImplementation(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      calls.push({
        url,
        method,
        body: init?.body ? JSON.parse(String(init.body)) : undefined,
      });

      if (url.endsWith('/professionals')) return jsonResponse([]);
      if (url.endsWith('/suggestions')) {
        if (method === 'POST') {
          return jsonResponse(
            {
              id: 'sg_1',
              communityId: COMMUNITY_ID,
              title: (JSON.parse(String(init?.body)) as { title: string }).title,
              body: 'Oficio: Prueba',
              status: 'open',
              authorName: 'Vecino',
              authorId: 'usr_1',
              createdAt: '2026-10-25T10:00:00.000Z',
            },
            201,
          );
        }
        return jsonResponse(suggestions);
      }
      return jsonResponse({ code: 'not_found', message: 'Ruta de prueba' }, 404);
    },
  );

  const view = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ProfessionalsCard communityId={COMMUNITY_ID} role={role} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { ...view, calls };
}

describe('ProfessionalsCard', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('permite a un vecino proponer un profesional (crea una sugerencia)', async () => {
    const { calls } = renderCard({ role: 'member' });

    fireEvent.click(
      await screen.findByRole('button', { name: 'Proponer profesional' }),
    );
    setNativeValue(screen.getByLabelText('Nombre'), 'Fontanería López');
    setNativeValue(screen.getByLabelText('Oficio'), 'Fontanería');
    setNativeValue(screen.getByLabelText('Teléfono'), '600 11 22 33');
    fireEvent.click(screen.getByRole('button', { name: 'Enviar propuesta' }));

    await waitFor(() => {
      const post = calls.find(
        (call) => call.method === 'POST' && call.url.endsWith('/suggestions'),
      );
      expect(post).toBeDefined();
      expect(post?.body).toMatchObject({
        title: 'Profesional: Fontanería López',
        body: expect.stringContaining('Oficio: Fontanería'),
      });
    });

    expect(
      await screen.findByText(/Propuesta enviada\. La junta la revisará/),
    ).toBeTruthy();
    // Un vecino no da de alta ni borra fichas.
    expect(screen.queryByRole('button', { name: 'Borrar' })).toBeNull();
    expect(screen.queryByText('Añadir profesional')).toBeNull();
  });

  it('a la junta le muestra las propuestas para darlas de alta', async () => {
    renderCard({
      role: 'owner',
      suggestions: [
        {
          id: 'sg_9',
          communityId: COMMUNITY_ID,
          title: 'Profesional: Electricidad Sur',
          body: 'Oficio: Electricista\nTeléfono: 611 22 33 44',
          status: 'open',
          authorName: 'Rosa Vecina',
          authorId: 'usr_2',
          createdAt: '2026-10-20T10:00:00.000Z',
        },
      ],
    });

    expect(await screen.findByText('Propuestas del vecindario')).toBeTruthy();
    expect(screen.getByText('Electricidad Sur')).toBeTruthy();
    expect(screen.getByText(/Propuesta de Rosa Vecina/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Dar de alta' })).toBeTruthy();

    // La junta da de alta directamente, sin pasar por el formulario de propuesta.
    expect(screen.getByText('Añadir profesional')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Proponer profesional' })).toBeNull();
  });
});
