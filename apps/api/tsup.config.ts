import { defineConfig } from 'tsup';

const external = ['@electric-sql/pglite', '@electric-sql/pglite-socket'];

export default defineConfig([
  {
    // Servidor local (pnpm start) y verificación de build en CI.
    entry: ['src/server.ts'],
    format: ['esm'],
    outDir: 'dist',
    clean: true,
    external,
  },
  {
    /**
     * Función serverless de Vercel. Se genera `api/index.mjs` en cada
     * build (Vercel ejecuta `pnpm build` ANTES de compilar funciones):
     * el bundle ESM evita los imports relativos sin extensión que
     * rompen en ESM y permite importar dependencias ESM-only.
     */
    entry: { index: 'src/vercel.ts' },
    format: ['esm'],
    outDir: 'api',
    clean: false,
    external,
    // El workspace @comunidad/shared es código fuente TS: se incluye.
    noExternal: [/@comunidad\/shared/],
  },
]);
