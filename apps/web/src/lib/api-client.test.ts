import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiFetch, type ApiError } from './api-client';

describe('apiFetch', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('devuelve el JSON cuando la respuesta es correcta', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ status: 'ok' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    await expect(apiFetch<{ status: string }>('/api/health')).resolves.toEqual({
      status: 'ok',
    });
  });

  it('convierte el envelope de error en ApiError tipado', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ code: 'forbidden', message: 'No permitido' }), {
        status: 403,
        headers: { 'content-type': 'application/json' },
      }),
    );

    await expect(apiFetch('/api/privado')).rejects.toMatchObject({
      name: 'ApiError',
      status: 403,
      code: 'forbidden',
      message: 'No permitido',
    } satisfies Partial<ApiError>);
  });

  it('envía las cookies de sesión en cada petición', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    await apiFetch('/api/communities');

    const [url, init] = spy.mock.calls[0] ?? [];
    expect(url).toContain('/api/communities');
    expect(init?.credentials).toBe('include');
  });
});
