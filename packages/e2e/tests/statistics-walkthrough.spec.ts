import { test, expect, loginAs } from '../fixtures/auth';

// Vidéo activée pour cette spec uniquement (démo PR #118) — pas de changement
// global de playwright.config.ts.
test.use({ video: 'on' });

test.describe('Parcours statistiques enseignant (issue #96, PR #118)', () => {
  test('un enseignant consulte la moyenne de classe puis le détail des statistiques', async ({ page }) => {
    await loginAs(page, 'teacher');

    // Widget "Moyenne de classe" du dashboard enseignant (fix : Promise.allSettled
    // au lieu de Promise.all, pour ne pas perdre les classes déjà chargées si une
    // seule échoue — commit 03d6bee).
    await expect(page.getByText('Moyenne de classe', { exact: true })).toBeVisible();
    await page.waitForLoadState('networkidle');

    // Navigation vers la page /statistics (accès réservé ADMIN/TEACHER/STAFF).
    await page.goto('/statistics');
    await expect(page).toHaveURL(/\/statistics/);
    // Scopé au contenu : le NavRail expose aussi un lien « Statistiques ».
    await expect(page.getByRole('main').getByText('Statistiques', { exact: true })).toBeVisible();

    // Une classe est présélectionnée par défaut (useChartClassSelection) : les
    // deux graphiques doivent atteindre un état stable avec des données.
    await expect(page.getByText('Moyenne par matière', { exact: true })).toBeVisible();
    await expect(page.getByText('Distribution des notes', { exact: true })).toBeVisible();
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/\d+ note\(s\)/)).toBeVisible();
  });
});
