import { defineConfig } from 'tsup';

const external = ['@electric-sql/pglite', '@electric-sql/pglite-socket'];

export default defineConfig([
  {
    /**
     * Salidas consumibles por Node: el servidor local (`pnpm start`) y
     * el bundle de la función de Vercel (`api/index.ts` reexporta
     * `dist/index.js`).
     */
    entry: { index: 'src/vercel.ts', server: 'src/server.ts' },
    format: ['esm'],
    outDir: 'dist',
    clean: true,
    external,
    // El workspace @comunidad/shared es código fuente TS: se incluye
    // en el bundle (Node no puede importar .ts en tiempo de ejecución).
    noExternal: [/@comunidad\/shared/],
  },
]);
