import { test, expect, loginAs, loginApi } from '../fixtures/auth';

/**
 * Conflits d'horaire (#245). Les tests de route vérifient déjà les 409 ; ce que
 * seul un test e2e peut vérifier, c'est ce que l'utilisateur LIT quand il se
 * trompe. Le backend répond en anglais comme le reste du module : sans la
 * traduction du code de conflit, l'interface française afficherait sa phrase
 * telle quelle.
 */

const CM2A = '22222222-2222-2222-2222-222222222201';
const MATHS = '33333333-3333-3333-3333-333333333302';
const TEACHER = '11111111-1111-1111-1111-111111111103';

test("un chevauchement d'horaire est refusé et expliqué en français", async ({ page, request }) => {
  const { token } = await loginApi(request, 'admin');

  // Séance couvrant la plage que le dialog préremplit (maintenant → +1 h), pour
  // provoquer le conflit sans avoir à piloter le sélecteur de date.
  const start = new Date(Date.now() - 30 * 60 * 1000);
  const end = new Date(Date.now() + 2 * 60 * 60 * 1000);
  const created = await request.post('/api/planning/sessions', {
    headers: { authorization: `Bearer ${token}` },
    data: {
      classId: CM2A,
      courseId: MATHS,
      teacherId: TEACHER,
      room: 'E2E-CONFLIT',
      startAt: start.toISOString(),
      endAt: end.toISOString(),
    },
  });
  expect(created.status()).toBe(201);
  const blocking = (await created.json()) as { id: string };

  try {
    await loginAs(page, 'admin');
    await page.goto('/planning');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'Ajouter' }).click();
    await page.locator('#sd-class').click();
    await page.getByRole('option', { name: 'CM2-A' }).click();
    // Les cours de la classe sont chargés après sa sélection.
    await expect(async () => {
      await page.locator('#sd-course').click();
      await expect(page.getByRole('option', { name: 'Mathématiques' })).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 20_000 });
    await page.getByRole('option', { name: 'Mathématiques' }).click();
    await page.locator('#sd-teacher').click();
    await page.getByRole('option', { name: /Dev Teacher/i }).click();

    await page.getByRole('button', { name: /^(Créer|Enregistrer)$/ }).click();

    const message = page.locator('.p-message');
    await expect(message).toBeVisible({ timeout: 15_000 });
    await expect(message).toContainText('déjà une séance sur ce créneau');
    // Le message anglais du backend ne doit jamais atteindre l'utilisateur.
    await expect(message).not.toContainText('overlapping');
  } finally {
    await request.delete(`/api/planning/sessions/${blocking.id}`, {
      headers: { authorization: `Bearer ${token}` },
    });
  }
});
