import { defineConfig } from '@playwright/test';

/**
 * E2E de los flujos críticos (registro, login con navegación, menú de
 * la comunidad y publicación de avisos). Levanta API y web con una base
 * de datos local aislada (`.pglite-e2e`).
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command:
        'pnpm --filter @comunidad/api exec tsx src/db/migrate.ts && pnpm --filter @comunidad/api exec tsx src/server.ts',
      url: 'http://localhost:3001/api/health',
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      env: {
        LOCAL_DB_DIR: '.pglite-e2e',
        AUTH_SECRET: 'secreto-de-pruebas-e2e-suficientemente-largo',
        NODE_ENV: 'test',
        CORS_ORIGIN: 'http://localhost:5173',
      },
    },
    {
      command: 'pnpm --filter @comunidad/web dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
