/**
 * Función serverless de Vercel.
 *
 * Vercel detecta las funciones ANTES de ejecutar `pnpm build`, por lo
 * que este archivo (fuente, versionado) es el punto de entrada. La
 * implementación real es el bundle ESM generado por tsup en
 * `dist/index.js`: imports locales resueltos y dependencias ESM
 * importadas de forma nativa.
 *
 * El export `fetch` es la firma web que espera el runtime de Node de
 * Vercel (un export `default` se interpreta como `(req, res)` y su
 * respuesta se ignora).
 */
export { fetch } from '../dist/index.js';
