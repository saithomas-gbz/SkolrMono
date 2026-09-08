import { test, expect, loginAs } from '../fixtures/auth';

/**
 * Rôle `PLATFORM_ADMIN` (#258).
 *
 * Le rôle existait côté backend et protégeait `GET /billing/establishments`,
 * mais le frontend l'ignorait : absent du type de rôle, absent de la cascade de
 * `dashboard.vue`. Le compte restait donc indéfiniment sur « Connexion en
 * cours… » — un cul-de-sac, pas un état transitoire.
 */

test("un administrateur de plateforme atteint sa page au lieu de rester bloque", async ({ page }) => {
  await loginAs(page, 'platformAdmin');
  await expect(page).toHaveURL(/\/platform(\/|$|\?)/, { timeout: 20_000 });
  await expect(page.getByText('Connexion en cours…')).toHaveCount(0);
});

test('il voit la liste des etablissements et leur abonnement', async ({ page }) => {
  await loginAs(page, 'platformAdmin');
  await page.goto('/platform');
  await page.waitForLoadState('networkidle');

  await expect(page.getByRole('table')).toBeVisible({ timeout: 20_000 });
  // Établissement seedé par `prisma/seed.ts`.
  await expect(page.getByText('Collège Skolr Demo')).toBeVisible();
});

test('son libelle de role s affiche en clair, pas la cle i18n', async ({ page }) => {
  await loginAs(page, 'platformAdmin');
  await expect(page.getByText('nav.role_platform_admin')).toHaveCount(0);
});

for (const role of ['admin', 'teacher', 'student', 'parent'] as const) {
  test(`${role} est redirige hors de /platform`, async ({ page }) => {
    await loginAs(page, role);
    await page.goto('/platform');
    await expect(page).toHaveURL(/\/(dashboard|admin|teacher|student|parent)(\/|$|\?)/, {
      timeout: 15_000,
    });
  });
}
