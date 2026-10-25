/**
 * Prueba de carga razonable (Fase 6): mide latencia y errores contra
 * un despliegue real usando solo `fetch` (sin dependencias).
 *
 * Uso:
 *   pnpm --filter @comunidad/api load-test -- [baseUrl] [--n 100] [--c 10]
 *   LOAD_EMAIL / LOAD_PASSWORD opcionales: mide también el listado
 *   autenticado (una sola sesión; no toca el límite de autenticación).
 */

const args = process.argv.slice(2);
const positional = args.filter((value) => !value.startsWith('--'));
const flag = (name: string, fallback: number): number => {
  const index = args.indexOf(name);
  const value = index >= 0 ? Number(args[index + 1]) : Number.NaN;
  return Number.isFinite(value) ? value : fallback;
};

const baseUrl = positional[0] ?? 'https://mantivecinos.vercel.app';
const total = flag('--n', 100);
const concurrency = flag('--c', 10);

interface Scenario {
  name: string;
  path: string;
  headers?: Record<string, string>;
}

async function signIn(): Promise<string | null> {
  const { LOAD_EMAIL, LOAD_PASSWORD } = process.env;
  if (!LOAD_EMAIL || !LOAD_PASSWORD) {
    return null;
  }
  const response = await fetch(`${baseUrl}/api/auth/sign-in/email`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      // Better Auth exige Origin (protección CSRF): lo envía un navegador.
      origin: new URL(baseUrl).origin,
    },
    body: JSON.stringify({ email: LOAD_EMAIL, password: LOAD_PASSWORD }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Login fallido: ${response.status} ${body.slice(0, 200)}`);
  }
  const setCookie = response.headers.getSetCookie()[0];
  return setCookie ? (setCookie.split(';')[0] ?? null) : null;
}

async function measure(
  scenario: Scenario,
  requests: number,
  pool: number,
): Promise<void> {
  const durations: number[] = [];
  let errors = 0;

  for (let done = 0; done < requests; done += pool) {
    const batch = Array.from({ length: Math.min(pool, requests - done) }, async () => {
      const started = performance.now();
      try {
        const response = await fetch(`${baseUrl}${scenario.path}`, {
          headers: scenario.headers,
        });
        if (!response.ok) {
          errors += 1;
        }
      } catch {
        errors += 1;
      } finally {
        durations.push(performance.now() - started);
      }
    });
    await Promise.all(batch);
  }

  durations.sort((a, b) => a - b);
  const pick = (ratio: number): number =>
    Math.round(
      durations[Math.min(durations.length - 1, Math.floor(durations.length * ratio))] ??
        0,
    );

  console.info(
    [
      `  ${scenario.name.padEnd(38)}`,
      `p50=${pick(0.5)}ms`,
      `p95=${pick(0.95)}ms`,
      `max=${Math.round(durations[durations.length - 1] ?? 0)}ms`,
      `errores=${errors}/${requests}`,
    ].join('  '),
  );
}

const cookie = await signIn();

const scenarios: Scenario[] = [{ name: 'GET /api/health', path: '/api/health' }];
if (cookie) {
  scenarios.push({
    name: 'GET /api/communities (sesión)',
    path: '/api/communities',
    headers: { cookie },
  });
}

console.info(`Destino: ${baseUrl} · ${total} peticiones · concurrencia ${concurrency}`);
for (const scenario of scenarios) {
  await measure(scenario, total, concurrency);
}
process.exit(0);

// Módulo TS (permite top-level await en el chequeo de tipos).
export {};
