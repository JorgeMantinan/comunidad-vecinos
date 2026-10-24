import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LoginPage } from './login';

function renderLogin() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('LoginPage', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('muestra errores de validación si el email no es válido', async () => {
    renderLogin();

    const submit = screen.getByRole('button', { name: 'Entrar' });
    submit.click();

    await waitFor(() => {
      expect(screen.getAllByText(/email válido/i).length).toBeGreaterThan(0);
    });
  });

  it('envía las credenciales al iniciar sesión', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input, init) => {
        const url = String(input);
        if (url.endsWith('/api/auth/sign-in/email')) {
          expect(init?.method).toBe('POST');
          expect(String(init?.body)).toContain('vecino@ejemplo.local');
          return new Response(
            JSON.stringify({
              user: { id: 'usr_1', name: 'Vicente' },
              session: { id: 'ses_1' },
            }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          );
        }
        return new Response(JSON.stringify({ user: null }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      });

    renderLogin();

    const email = screen.getByLabelText('Email');
    const password = screen.getByLabelText('Contraseña');
    email.dispatchEvent(new Event('input', { bubbles: true }));
    password.dispatchEvent(new Event('input', { bubbles: true }));

    // React Hook Form lee el valor del nodo; fijamos los valores directamente.
    const setNativeValue = (element: HTMLInputElement, value: string): void => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set;
      setter?.call(element, value);
      element.dispatchEvent(new Event('input', { bubbles: true }));
    };
    setNativeValue(email as HTMLInputElement, 'vecino@ejemplo.local');
    setNativeValue(password as HTMLInputElement, 'Password123!');

    screen.getByRole('button', { name: 'Entrar' }).click();

    await waitFor(() => {
      expect(
        fetchSpy.mock.calls.some(([input]) =>
          String(input).endsWith('/api/auth/sign-in/email'),
        ),
      ).toBe(true);
    });
  });
});
