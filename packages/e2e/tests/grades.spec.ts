import { test, expect, loginAs } from '../fixtures/auth';

test('un élève consulte son carnet de notes', async ({ page }) => {
  await loginAs(page, 'student');
  await page.goto('/grades/my-grades');

  // Titre de la carte `grades.my_grades.title`.
  await expect(page.getByText('Mes notes', { exact: true })).toBeVisible();
  // Un compte élève (USER) n'est pas en mode restreint.
  await expect(page.getByText('Cette page est réservée aux élèves.')).toHaveCount(0);
});
