const API_BASE = import.meta.env.VITE_API_URL ?? '';

/** Error de API con el código tipado del backend. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

/**
 * Cliente HTTP mínimo con sesión (cookies) y manejo de errores
 * según el envelope `{ code, message }` de la API.
 */
export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      code?: string;
      message?: string;
    } | null;
    throw new ApiError(
      response.status,
      body?.code ?? 'internal_error',
      body?.message ?? 'Error inesperado en el servidor',
    );
  }

  return (await response.json()) as T;
}
