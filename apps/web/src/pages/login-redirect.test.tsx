import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LoginPage } from './login';

const validSession = {
  user: {
    id: 'usr_1',
    name: 'Vicente Vecino',
    email: 'vecino@ejemplo.local',
    emailVerified: true,
  },
  session: { id: 'ses_1', expiresAt: '2030-01-01T00:00:00.000Z' },
};

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

function setNativeValue(element: HTMLInputElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value',
  )?.set;
  setter?.call(element, value);
  element.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('LoginPage tras iniciar sesión', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('navega al panel y no rebota a /login (regresión del bug de sesión cacheada)', async () => {
    let signedIn = false;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith('/api/auth/sign-in/email')) {
        signedIn = true;
        return jsonResponse({
          token: 'token-de-prueba',
          user: { id: 'usr_1', name: 'Vicente Vecino' },
        });
      }
      if (url.endsWith('/api/auth/get-session')) {
        return signedIn
          ? jsonResponse(validSession)
          : jsonResponse({ code: 'unauthorized' }, 401);
      }
      throw new Error(`URL inesperada: ${url}`);
    });

    render(
      <QueryClientProvider
        client={
          new QueryClient({
            defaultOptions: { queries: { retry: false } },
          })
        }
      >
        <MemoryRouter initialEntries={['/login']}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<div>panel de la comunidad</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const submit = await screen.findByRole('button', { name: 'Entrar' });
    setNativeValue(
      screen.getByLabelText('Email') as HTMLInputElement,
      'vecino@ejemplo.local',
    );
    setNativeValue(
      screen.getByLabelText('Contraseña') as HTMLInputElement,
      'Password123!',
    );
    submit.click();

    await waitFor(
      () => {
        expect(screen.getByText('panel de la comunidad')).toBeTruthy();
      },
      { timeout: 5000 },
    );
  });
});
