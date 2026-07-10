import { test, expect, loginAs } from '../fixtures/auth';

// Vidéo activée pour cette spec uniquement (démo PR #119) — pas de changement
// global de playwright.config.ts.
test.use({ video: 'on' });

// Chemins résolus depuis le cwd Playwright (packages/e2e).
const demoDir = 'demo';

/**
 * Recule le calendrier FullCalendar jusqu'à une semaine contenant des séances.
 * Les données seed s'arrêtent fin juin 2026 alors que le test tourne « aujourd'hui »
 * (juillet), donc la semaine courante est vide.
 */
async function gotoPopulatedWeek(page: import('@playwright/test').Page): Promise<void> {
  const prev = page.locator('.fc-prev-button');
  for (let i = 0; i < 8; i++) {
    if ((await page.locator('.fc-event').count()) > 0) return;
    await prev.click();
    await page.waitForTimeout(400);
  }
  await page.waitForLoadState('networkidle');
}

test.describe('Emploi du temps — filtrage par rôle (issue #77, PR #119)', () => {
  test('enseignant : « Mes matières » puis « Vue classe », et filtre admin', async ({ page }) => {
    test.setTimeout(90_000);
    // --- Enseignant : vue par défaut « Mes matières » -----------------------
    await loginAs(page, 'teacher');
    await page.goto('/planning');
    await expect(page.getByText('Emploi du temps', { exact: true })).toBeVisible();

    // La bascule enseignant est présente, « Mes matières » sélectionné par défaut.
    await expect(page.getByText('Mes matières', { exact: true })).toBeVisible();
    await expect(page.getByText('Vue classe', { exact: true })).toBeVisible();

    // Les données seed couvrent l'année scolaire 2025-2026 : on recule le calendrier
    // jusqu'à une semaine peuplée (fin juin) pour rendre la démo lisible.
    await gotoPopulatedWeek(page);
    await expect(page.locator('.fc-event').first()).toBeVisible();
    await page.screenshot({ path: `${demoDir}/planning-teacher-mine-pr119.png`, fullPage: true });

    // --- Enseignant : bascule « Vue classe » --------------------------------
    await page.getByText('Vue classe', { exact: true }).click();

    // Le select de classe apparaît (limité aux classes du prof) et présélectionne
    // la première : le calendrier se recharge avec TOUTES les séances de la classe.
    await page.waitForLoadState('networkidle');
    await gotoPopulatedWeek(page);
    await expect(page.locator('.fc-event').first()).toBeVisible();

    // Les séances du prof connecté sont mises en évidence par un badge « Moi ».
    await expect(page.locator('.ev-mine').first()).toBeVisible();
    await page.screenshot({ path: `${demoDir}/planning-teacher-class-pr119.png`, fullPage: true });

    // --- Admin : filtre par professeur --------------------------------------
    // Déconnexion (cookie de session) avant de se reconnecter en admin, sinon le
    // middleware auth redirige /auth/login vers /dashboard.
    await page.context().clearCookies();
    await loginAs(page, 'admin');
    await page.goto('/planning');
    await expect(page.getByText('Emploi du temps', { exact: true })).toBeVisible();
    // Le filtre « Filtrer par professeur » (admin) est disponible en plus du filtre classe.
    await expect(page.getByLabel('Filtrer par professeur')).toBeVisible();
    await gotoPopulatedWeek(page);
    await expect(page.locator('.fc-event').first()).toBeVisible();
    await page.screenshot({ path: `${demoDir}/planning-admin-pr119.png`, fullPage: true });
  });
});
