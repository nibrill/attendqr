import { expect, test } from '@playwright/test';

/** Flujo completo en modo demo: el docente crea una clase y el estudiante registra asistencia. */

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

async function login(page: import('@playwright/test').Page, email: string) {
  await page.getByLabel('Correo').fill(email);
  await page.getByLabel('Contraseña').fill('demo1234');
  await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
  await expect(page).toHaveURL(/\/app\//);
}

/** Token rotativo vigente, calculado igual que en `src/app/core/qr.ts`. */
async function currentPayload(page: import('@playwright/test').Page): Promise<string> {
  return page.evaluate(async () => {
    const [s] = JSON.parse(localStorage.getItem('attendqr.sessions')!) as { id: string; code: string }[];
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const step = Math.floor(Date.now() / 20_000);
    const data = new TextEncoder().encode(`${s.code}:${step}`);
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', data));
    const token = Array.from(digest.slice(0, 6), (b) => alphabet[b % alphabet.length]).join('');
    return `attendqr:${s.id}.${token}`;
  });
}

test('el docente crea una clase y ve el QR rotativo', async ({ page }) => {
  await login(page, 'docente@demo.cl');
  await page.getByRole('button', { name: 'Nueva clase' }).click();
  await page.getByLabel('Asignatura').fill('Programación Móvil');
  await page.getByLabel('Sala').fill('Laboratorio 3');
  await page.getByRole('button', { name: 'Crear y ver QR' }).click();

  await expect(page.getByRole('heading', { name: 'Programación Móvil' })).toBeVisible();
  await expect(page.getByAltText(/Código QR/)).toBeVisible();
  await expect(page.getByText(/El código cambia cada 20 s/)).toBeVisible();
  await expect(page.getByText('Asistentes (0)')).toBeVisible();
});

test('un estudiante registra asistencia con el código vigente, sin duplicados', async ({ page }) => {
  await login(page, 'docente@demo.cl');
  await page.getByRole('button', { name: 'Nueva clase' }).click();
  await page.getByLabel('Asignatura').fill('Redes');
  await page.getByLabel('Sala').fill('B-204');
  await page.getByRole('button', { name: 'Crear y ver QR' }).click();
  await expect(page.getByAltText(/Código QR/)).toBeVisible();

  // Cambia a la cuenta del estudiante (los datos demo viven en localStorage).
  await page.evaluate(() => localStorage.setItem('attendqr.current', JSON.stringify('u-alumno')));
  await page.goto('/app/escanear');

  const payload = await currentPayload(page);
  await page.getByRole('textbox', { name: 'Código de la clase' }).fill(payload);
  await page.getByRole('button', { name: 'Registrar', exact: true }).click();
  await expect(page.getByText('¡Listo, Javier!')).toBeVisible();

  await page.getByRole('button', { name: 'Escanear otro' }).click();
  await page.getByRole('textbox', { name: 'Código de la clase' }).fill(payload);
  await page.getByRole('button', { name: 'Registrar', exact: true }).click();
  await expect(page.getByText('Ya registraste tu asistencia a esta clase.')).toBeVisible();

  await page.getByRole('tab', { name: 'Historial' }).click();
  await expect(page.getByText('Redes')).toBeVisible();
});

test('rechaza un código inválido', async ({ page }) => {
  await login(page, 'alumno@demo.cl');
  await page.getByRole('textbox', { name: 'Código de la clase' }).fill('attendqr:no-existe.AAAAAA');
  await page.getByRole('button', { name: 'Registrar', exact: true }).click();
  await expect(page.getByText('Este código QR no es válido.')).toBeVisible();
});
