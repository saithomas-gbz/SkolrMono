import { test, expect, loginAs } from '../fixtures/auth';

/**
 * Gardes de rôle sur les pages qui masquaient leur contenu au lieu de rediriger,
 * et absence du lien « Accueil » redondant (#256).
 *
 * Ces pages ne présentaient pas de fuite : les composants appelant l'API étaient
 * dans le `v-else`, donc jamais montés. Mais la page se montait pour tout le
 * monde, ce qui la rendait atteignable et incohérent avec le reste.
 */

const REDIRIGE = /\/(dashboard|admin|teacher|student|parent)(\/|$|\?)/;

const cas = [
  { page: '/grades/my-grades', autorise: 'student', refuses: ['teacher', 'admin', 'parent'] },
  { page: '/planning/absences', autorise: 'teacher', refuses: ['student', 'parent'] },
  { page: '/parent/absences', autorise: 'parent', refuses: ['student', 'teacher'] },
  { page: '/parent/justifications', autorise: 'parent', refuses: ['student', 'teacher'] },
] as const;

for (const { page: url, autorise, refuses } of cas) {
  for (const role of refuses) {
    test(`${role} est redirige hors de ${url}`, async ({ page }) => {
      await loginAs(page, role);
      await page.goto(url);
      await expect(page).toHaveURL(REDIRIGE, { timeout: 15_000 });
    });
  }

  test(`${autorise} accede a ${url}`, async ({ page }) => {
    await loginAs(page, autorise);
    await page.goto(url);
    await expect(page).toHaveURL(new RegExp(`${url}(\\?|$)`), { timeout: 15_000 });
  });
}

test("le lien Accueil ne figure plus dans la navigation", async ({ page }) => {
  await loginAs(page, 'teacher');
  // « Tableau de bord » mène au même endroit : deux entrées pour une destination.
  await expect(page.getByRole('link', { name: 'Accueil' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Tableau de bord' })).toBeVisible();
});

test("la route racine reste le point d'entree et oriente selon la session", async ({ page }) => {
  // Le lien disparaît de la navigation, mais `/` doit continuer de router : c'est
  // l'URL du domaine nu.
  await loginAs(page, 'student');
  await page.goto('/');
  await expect(page).toHaveURL(REDIRIGE, { timeout: 15_000 });
});
