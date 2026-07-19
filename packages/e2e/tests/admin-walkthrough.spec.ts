import { test, expect, loginAs } from '../fixtures/auth';

test.describe('Parcours administrateur (issue #146)', () => {
  test("un administrateur consulte le tableau de bord puis la liste des utilisateurs", async ({ page }) => {
    await loginAs(page, 'admin');

    // Widget "Absences par jour" du dashboard admin (AttendanceWeekChart).
    await expect(page.getByText('Absences par jour', { exact: true })).toBeVisible();
    await page.waitForLoadState('networkidle');

    // Navigation vers /admin/users (gestion des utilisateurs, réservée ADMIN).
    await page.goto('/admin/users');
    await expect(page).toHaveURL(/\/admin\/users/);
    await expect(page.getByRole('main').getByText('Utilisateurs', { exact: true })).toBeVisible();

    await page.waitForLoadState('networkidle');

    // La table affiche les comptes seedés (au minimum le compte admin lui-même).
    await expect(page.getByRole('table')).toBeVisible();
    await expect(page.getByText('dev.admin@skolr.local')).toBeVisible();
    await expect(page.getByText('Aucun utilisateur.')).toHaveCount(0);
  });
});
