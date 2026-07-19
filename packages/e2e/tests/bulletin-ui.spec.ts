import { readFileSync } from 'node:fs';
import { test, expect, loginAs } from '../fixtures/auth';

test.describe('Bulletin PDF — bouton de téléchargement (/grades/my-grades)', () => {
  test('bouton masqué pour un rôle non-USER (canAccess=false)', async ({ page }) => {
    await loginAs(page, 'teacher');
    await page.goto('/grades/my-grades');
    // grades.my_grades.restricted
    await expect(page.getByText('Cette page est réservée aux élèves.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Télécharger le bulletin PDF' })).toHaveCount(0);
  });

  test('bouton masqué pendant le chargement des notes', async ({ page }) => {
    await page.route('**/api/grade/grades/user/**', async (route) => {
      await new Promise((r) => setTimeout(r, 800)); // force un état `pending` observable
      await route.continue();
    });
    await loginAs(page, 'user');
    await page.goto('/grades/my-grades');
    // grades.my_grades.loading
    await expect(page.getByText('Chargement de vos notes…')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Télécharger le bulletin PDF' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Télécharger le bulletin PDF' })).toBeVisible({
      timeout: 5000,
    });
  });

  // Simulé : aucun compte USER seedé n'a réellement 0 note (voir
  // bulletin-api.spec.ts). On intercepte donc la liste de notes pour
  // reproduire courseGroups.length === 0.
  test("bouton masqué quand l'élève n'a aucune note (simulé)", async ({ page }) => {
    await page.route('**/api/grade/grades/user/**', (route) =>
      route.fulfill({ json: { data: [], message: 'ok' } }),
    );
    await loginAs(page, 'user');
    await page.goto('/grades/my-grades');
    // grades.my_grades.empty
    await expect(page.getByText('Aucune note enregistrée pour le moment.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Télécharger le bulletin PDF' })).toHaveCount(0);
  });

  test('téléchargement réussi : notes réelles (dev.user), PDF valide', async ({ page }) => {
    await loginAs(page, 'user');
    await page.goto('/grades/my-grades');
    const button = page.getByRole('button', { name: 'Télécharger le bulletin PDF' });
    await expect(button).toBeVisible();

    const [download, response] = await Promise.all([
      page.waitForEvent('download'),
      page.waitForResponse((r) => r.url().includes('/api/grade/users/') && r.url().endsWith('/bulletin')),
      button.click(),
    ]);

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toBe('application/pdf');
    expect(download.suggestedFilename()).toBe('bulletin.pdf'); // hardcodé côté front (a.download)

    const path = await download.path();
    expect(path).not.toBeNull();
    const bytes = readFileSync(path!);
    expect(bytes.subarray(0, 4).toString()).toBe('%PDF');

    // `downloading` retombe bien à false une fois le clic terminé.
    await expect(button).toHaveText('Télécharger le bulletin PDF');
  });

  test('téléchargement réussi : élève sans note GRADED (dev.student, tout ABSENT)', async ({
    page,
  }) => {
    // Régression : courseGroups.length > 0 même quand aucune entrée n'est
    // GRADED (dev.student est ABSENT sur ses 3 devoirs CM2-A) — le bouton
    // reste visible et le téléchargement doit fonctionner malgré l'absence de
    // moyenne.
    await loginAs(page, 'student');
    await page.goto('/grades/my-grades');
    const button = page.getByRole('button', { name: 'Télécharger le bulletin PDF' });
    await expect(button).toBeVisible();
    const [download] = await Promise.all([page.waitForEvent('download'), button.click()]);
    expect(download.suggestedFilename()).toBe('bulletin.pdf');
  });

  test("toast d'erreur si le téléchargement échoue", async ({ page }) => {
    await page.route('**/api/grade/users/**/bulletin', (route) =>
      route.fulfill({ status: 403, json: { error: 'Forbidden' } }),
    );
    await loginAs(page, 'user');
    await page.goto('/grades/my-grades');
    const button = page.getByRole('button', { name: 'Télécharger le bulletin PDF' });
    await expect(button).toBeVisible();
    await button.click();

    // grades.my_grades.download_error — Toast (PrimeVue) monté dans
    // layouts/default.vue
    await expect(
      page.getByText('Impossible de générer le bulletin. Veuillez réessayer.'),
    ).toBeVisible();
    // `downloading` retombe à false dans le `finally` : le libellé ne reste
    // pas bloqué sur "Téléchargement…"
    await expect(button).toHaveText('Télécharger le bulletin PDF');
  });
});
