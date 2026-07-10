import { test, expect, loginAs } from '../fixtures/auth';

// Vidéo activée pour cette spec uniquement (démo PR #120) — pas de changement
// global de playwright.config.ts.
test.use({ video: 'on' });

// Chemins résolus depuis le cwd Playwright (packages/e2e).
const demoDir = 'demo';

// IDs seedés (scripts/seed/dev-users.ts, DEV_CLASS_IDS / DEV_USER_IDS.teacher) —
// `dev.teacher` est prof principal des deux classes de démo.
const CLASS_ID_SCIENCES6 = '22222222-2222-2222-2222-222222222202';
const TEACHER_ID = '11111111-1111-1111-1111-111111111103';

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

test.describe('Emploi du temps — filtres simplifiés (issue #120, PR #120)', () => {
  test('enseignant : dropdown « Affichage » unique, et filtres admin', async ({ page }) => {
    test.setTimeout(90_000);
    // --- Enseignant : dropdown « Affichage », valeur par défaut « Mes matières » ---
    await loginAs(page, 'teacher');
    await page.goto('/planning');
    await expect(page.getByText('Emploi du temps', { exact: true })).toBeVisible();

    // Un seul dropdown de portée (fusion de l'ancien SelectButton + select classe
    // conditionnel), présélectionné sur « Mes matières ».
    const displayDropdown = page.getByLabel("Mode d'affichage");
    await expect(displayDropdown).toBeVisible();
    await expect(page.getByText('Mes matières', { exact: true })).toBeVisible();

    await gotoPopulatedWeek(page);
    await expect(page.locator('.fc-event').first()).toBeVisible();
    await page.screenshot({ path: `${demoDir}/planning-teacher-mine-pr120.png`, fullPage: true });

    // --- Enseignant : sélection d'une classe dans le dropdown unique ------------
    await displayDropdown.click();
    await page.getByRole('option', { name: '6ème Sciences' }).click();

    await page.waitForLoadState('networkidle');
    await gotoPopulatedWeek(page);
    await expect(page.locator('.fc-event').first()).toBeVisible();

    // Les séances du prof connecté sont mises en évidence par un liseré (classe
    // `is-mine`), sans badge texte « Moi ».
    await expect(page.locator('.fc-event.is-mine').first()).toBeVisible();
    await expect(page.locator('.ev-mine')).toHaveCount(0);
    await page.screenshot({ path: `${demoDir}/planning-teacher-class-pr120.png`, fullPage: true });

    // --- Admin : filtre professeur toujours présent, filtre élève supprimé -----
    // Déconnexion (cookie de session) avant de se reconnecter en admin, sinon le
    // middleware auth redirige /auth/login vers /dashboard.
    await page.context().clearCookies();
    await loginAs(page, 'admin');
    await page.goto('/planning');
    await expect(page.getByText('Emploi du temps', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Filtrer par professeur')).toBeVisible();
    // Le filtre élève (redondant avec le filtre classe) a été retiré côté UI.
    await expect(page.getByLabel('Filtrer par élève')).toHaveCount(0);
    await gotoPopulatedWeek(page);
    await expect(page.locator('.fc-event').first()).toBeVisible();
    await page.screenshot({ path: `${demoDir}/planning-admin-pr120.png`, fullPage: true });
  });

  test('deep-links ?classId= et ?teacherId= reflètent l\'état au chargement', async ({ page }) => {
    test.setTimeout(60_000);

    // --- Enseignant : ?classId= présélectionne directement la classe -----------
    await loginAs(page, 'teacher');
    await page.goto(`/planning?classId=${CLASS_ID_SCIENCES6}`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('6ème Sciences', { exact: true })).toBeVisible();

    // --- Admin : ?classId= et ?teacherId= combinés ------------------------------
    await page.context().clearCookies();
    await loginAs(page, 'admin');
    await page.goto(`/planning?classId=${CLASS_ID_SCIENCES6}&teacherId=${TEACHER_ID}`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('6ème Sciences', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Filtrer par professeur')).toBeVisible();
  });
});
