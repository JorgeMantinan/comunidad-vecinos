import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GoogleSignInButton } from './google-signin-button';

const health = (google: boolean): Response =>
  new Response(
    JSON.stringify({
      status: 'ok',
      version: '0.0.0',
      timestamp: '2026-10-27T10:00:00.000Z',
      login: { google },
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );

function renderButton() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <GoogleSignInButton />
    </QueryClientProvider>,
  );
}

describe('GoogleSignInButton', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('no se muestra si el servidor no tiene Google configurado', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(health(false));

    renderButton();

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Continuar con Google/ })).toBeNull();
    });
  });

  it('se muestra y pide el acceso cuando el servidor lo habilita', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.endsWith('/api/health')) {
          return health(true);
        }
        if (url.endsWith('/api/auth/sign-in/social')) {
          return new Response(
            JSON.stringify({
              url: 'https://accounts.google.com/o/oauth2/auth',
              redirect: true,
            }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          );
        }
        return new Response(JSON.stringify({ code: 'not_found' }), {
          status: 404,
          headers: { 'content-type': 'application/json' },
        });
      });

    renderButton();

    const button = await screen.findByRole('button', { name: /Continuar con Google/ });
    button.click();

    await waitFor(() => {
      const social = fetchSpy.mock.calls.find(([input]) =>
        String(input).endsWith('/api/auth/sign-in/social'),
      );
      expect(social).toBeDefined();
      expect(String(social?.[1]?.body)).toContain('"provider":"google"');
      expect(String(social?.[1]?.body)).toContain('"callbackURL":"/"');
    });
  });
});
