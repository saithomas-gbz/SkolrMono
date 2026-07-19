import { test, expect, loginAs } from '../fixtures/auth';

test.describe('Parcours notes élève (issue #146)', () => {
  test('un élève consulte son carnet de notes', async ({ page }) => {
    // Compte `user` (persona élève avec des notes réelles) plutôt que `student`
    // (persona tout-ABSENT) : ce parcours doit démontrer l'affichage de vraies
    // notes, pas seulement l'état vide.
    await loginAs(page, 'user');
    await page.goto('/grades/my-grades');

    // Titre `grades.my_grades.title` : porté par la TopBar (`<h2 class="title">`,
    // via usePageHeader) depuis le restyle KPI — plus de titre inline dans le contenu.
    await expect(page.getByRole('heading', { name: 'Mes notes' })).toBeVisible();
    // Un compte élève (USER) n'est pas en mode restreint.
    await expect(page.getByText('Cette page est réservée aux élèves.')).toHaveCount(0);

    await page.waitForLoadState('networkidle');

    // Le KPI "Moyenne générale" ne s'affiche que si des notes existent : preuve
    // que le parcours affiche de vraies données, pas un état vide.
    await expect(page.getByText('Moyenne générale', { exact: true })).toBeVisible();
    await expect(page.getByText('Aucune note enregistrée pour le moment.')).toHaveCount(0);
  });
});
