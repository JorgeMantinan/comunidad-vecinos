import { Hono } from 'hono';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { TestContext } from '../../test/test-context';
import { createTestContext } from '../../test/test-context';
import { healthRoutes } from './routes';

describe('Health (heartbeat)', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestContext();
  });

  afterAll(async () => {
    await ctx.close();
  });

  it('responde ok sin autenticación y dice si Google está disponible', async () => {
    const res = await ctx.request('/api/health');
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      status: string;
      version: string;
      login: { google: boolean };
    };
    expect(body.status).toBe('ok');
    expect(body.version).toBe('0.0.0');
    // En los tests no hay credenciales de Google.
    expect(body.login).toEqual({ google: false });
  });

  it('informa google:true cuando hay credenciales configuradas', async () => {
    const app = new Hono().route('/health', healthRoutes({ login: { google: true } }));
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { login: { google: boolean } };
    expect(body.login.google).toBe(true);
  });
});
