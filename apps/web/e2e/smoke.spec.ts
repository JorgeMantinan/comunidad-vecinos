import { expect, test } from '@playwright/test';

/**
 * Flujos críticos: registro, login con navegación (regresión del bug
 * en el que la URL se quedaba en /login), menú de la comunidad y
 * publicación de un aviso.
 */

const uniqueEmail = (prefix: string): string =>
  `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}@e2e.local`;

test('registro entra directamente al panel', async ({ page }) => {
  await page.goto('/register');
  await page.getByLabel('Nombre').fill('Vecino E2E');
  await page.getByLabel('Email').fill(uniqueEmail('registro'));
  await page.getByLabel('Contraseña').fill('Password123!');
  await page.getByRole('button', { name: 'Crear cuenta' }).click();

  await page.waitForURL('/');
  await expect(page.getByText('Mis comunidades')).toBeVisible();
});

test('login navega al panel y NO se queda en /login (regresión)', async ({ page }) => {
  // 1) Registro para tener una cuenta.
  await page.goto('/register');
  await page.getByLabel('Nombre').fill('Login E2E');
  const email = uniqueEmail('login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Contraseña').fill('Password123!');
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  await page.waitForURL('/');

  // 2) Cerramos sesión recargando sin sesión: vamos al login.
  await page.context().clearCookies();
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Contraseña').fill('Password123!');
  await page.getByRole('button', { name: 'Entrar' }).click();

  // 3) La URL DEBE cambiar a / (aquí fallaba el bug original).
  await page.waitForURL('/', { timeout: 15_000 });
  await expect(page.getByText('Mis comunidades')).toBeVisible();
});

test('los avisos legales son públicos y navegan', async ({ page }) => {
  await page.goto('/legal');
  await expect(
    page.getByRole('link', { name: /Política de privacidad/ }),
  ).toBeVisible();

  await page.getByRole('link', { name: /Política de privacidad/ }).click();
  await page.waitForURL('/legal/privacidad');
  await expect(
    page.getByRole('heading', { name: 'Política de privacidad' }),
  ).toBeVisible();
  await expect(page.getByText(/No hay perfiles automáticos/)).toBeVisible();

  // Vuelta al índice y a derechos (sin sesión).
  await page.getByRole('link', { name: /Volver a avisos legales/ }).click();
  await page.waitForURL('/legal');
  await page.getByRole('link', { name: /Tus derechos/ }).click();
  await page.waitForURL('/legal/derechos');
  await expect(page.getByRole('link', { name: 'www.aepd.es' })).toBeVisible();
});

test('crear comunidad abre el menú de botones y publica un aviso', async ({ page }) => {
  await page.goto('/register');
  await page.getByLabel('Nombre').fill('Menu E2E');
  await page.getByLabel('Email').fill(uniqueEmail('menu'));
  await page.getByLabel('Contraseña').fill('Password123!');
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  await page.waitForURL('/');

  // Crear comunidad desde el panel.
  await page.getByLabel('Nombre').fill('Comunidad E2E');
  await page.getByLabel('Dirección').fill('Calle de Prueba 1');
  await page.getByRole('button', { name: 'Crear comunidad' }).click();
  await page.waitForURL(/\/communities\/.+/);

  // El menú de botones grandes está presente.
  await expect(page.getByRole('link', { name: /Avisos/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Reuniones/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /El dinero/ })).toBeVisible();

  // Entrar en Avisos y publicar.
  await page
    .getByRole('link', { name: /Avisos/ })
    .first()
    .click();
  await page.waitForURL(/\/avisos$/);
  await expect(page.getByRole('heading', { name: '📢 Avisos' })).toBeVisible();

  await page.getByLabel('Título').fill('Aviso de prueba E2E');
  await page.getByLabel('Contenido').fill('Publicado desde el test E2E.');
  await page.getByRole('button', { name: 'Publicar' }).click();

  await expect(page.getByText('Aviso de prueba E2E')).toBeVisible();

  // Vuelta al menú.
  await page.getByRole('button', { name: /Volver al menú/ }).click();
  await page.waitForURL(/\/communities\/[^/]+$/);
});

test('el conmutador de tema aplica el modo oscuro y lo recuerda', async ({ page }) => {
  await page.goto('/legal');
  const html = page.locator('html');
  await expect(html).not.toHaveClass(/dark/);

  await page.getByRole('button', { name: /Oscuro/ }).click();
  await expect(html).toHaveClass(/dark/);

  // La elección sobrevive a la recarga (localStorage + script previo).
  await page.reload();
  await expect(html).toHaveClass(/dark/);

  await page.getByRole('button', { name: /Claro/ }).click();
  await expect(html).not.toHaveClass(/dark/);
});
