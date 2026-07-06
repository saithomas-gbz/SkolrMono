import { test, expect, loginAs } from '../fixtures/auth';

test.describe('Authentification & gardes de route', () => {
  test('redirige un visiteur non authentifié vers le login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/auth\/login/);
    await expect(page.getByRole('button', { name: 'Se connecter' })).toBeVisible();
  });

  test('connecte dev.user et atterrit sur son tableau de bord élève', async ({ page }) => {
    await loginAs(page, 'user');
    await expect(page).toHaveURL(/\/student/);
  });

  test("empêche un utilisateur connecté de revenir sur /auth/login (garde guest)", async ({
    page,
  }) => {
    await loginAs(page, 'user');
    await page.goto('/auth/login');
    await expect(page).not.toHaveURL(/\/auth\/login/);
  });

  test("déconnexion : retour au login et perte de l'accès aux pages protégées", async ({
    page,
  }) => {
    await loginAs(page, 'user');

    await page.getByRole('button', { name: 'Menu' }).click();
    await page.getByRole('button', { name: 'Déconnexion' }).click();
    await expect(page).toHaveURL(/\/auth\/login/);

    // La garde `auth` renvoie de nouveau au login sur une page protégée.
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
