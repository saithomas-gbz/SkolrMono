import { test, expect, loginAs } from '../fixtures/auth';

test.describe('Parcours parent (issue #146)', () => {
  test('un parent consulte la fiche enfant puis ses absences', async ({ page }) => {
    await loginAs(page, 'parent');

    // Carte enfant sur le dashboard parent (`parent.dashboard_title` = "Mes enfants").
    await expect(page.getByText('Mes enfants', { exact: true })).toBeVisible();
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Léa Martin', { exact: true })).toBeVisible();

    // Action clé : consulter les absences de l'enfant (bouton sur la carte).
    await page
      .getByRole('button', { name: 'Voir les absences' })
      .first()
      .click();

    await expect(page).toHaveURL(/\/parent\/absences/);
    await expect(page.getByRole('main').getByText('Absences', { exact: true })).toBeVisible();
  });
});
