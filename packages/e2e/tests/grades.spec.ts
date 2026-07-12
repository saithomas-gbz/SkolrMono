import { test, expect, loginAs } from '../fixtures/auth';

test('un élève consulte son carnet de notes', async ({ page }) => {
  await loginAs(page, 'student');
  await page.goto('/grades/my-grades');

  // Titre `grades.my_grades.title` : porté par la TopBar (`<h2 class="title">`,
  // via usePageHeader) depuis le restyle KPI — plus de titre inline dans le contenu.
  await expect(page.getByRole('heading', { name: 'Mes notes' })).toBeVisible();
  // Un compte élève (USER) n'est pas en mode restreint.
  await expect(page.getByText('Cette page est réservée aux élèves.')).toHaveCount(0);
});
