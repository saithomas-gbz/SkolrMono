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
 * Dernier jour couvert par les séances seedées — `SCHOOL_END` dans
 * `packages/backend/prisma/seed.ts`. L'année scolaire du seed est figée
 * (2025-09-01 → 2026-06-30) alors que la suite tourne « aujourd'hui » : l'écart
 * entre les deux grandit d'une semaine par semaine.
 */
const SEED_SCHOOL_END = new Date('2026-06-30T00:00:00Z');

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Nombre de reculs d'une semaine nécessaires pour ramener le calendrier dans la
 * fenêtre du seed. Ce nombre était codé en dur à 8, ce qui a tenu tant que la
 * date d'exécution restait proche de fin juin 2026, puis a fait échouer la spec
 * dès que l'écart a dépassé 8 semaines. Le dériver de l'écart réel évite que le
 * test se remette à casser tout seul au fil du temps.
 *
 * Correctif de circonstance : la vraie solution est un seed dont la fenêtre suit
 * la date du jour, ou une navigation par date dans l'URL de `/planning`. Les
 * deux dépassent le périmètre de cette PR.
 */
function weeksBackToSeededData(): number {
  const drift = Date.now() - SEED_SCHOOL_END.getTime();
  if (drift <= 0) return 8;
  // +2 semaines de marge : la dernière semaine du seed peut être partielle
  // (jours fériés, week-end), et `Date.now()` tombe rarement un lundi.
  return Math.ceil(drift / ONE_WEEK_MS) + 2;
}

/**
 * Recule le calendrier FullCalendar jusqu'à une semaine contenant des séances,
 * et échoue explicitement si la fenêtre du seed reste introuvable — sans quoi
 * l'échec se manifeste plus loin par un « element(s) not found » sur `.fc-event`
 * qui ne dit rien de la cause.
 */
async function gotoPopulatedWeek(page: import('@playwright/test').Page): Promise<void> {
  const prev = page.locator('.fc-prev-button');
  const maxSteps = weeksBackToSeededData();

  for (let i = 0; i <= maxSteps; i++) {
    if ((await page.locator('.fc-event').count()) > 0) {
      await page.waitForLoadState('networkidle');
      return;
    }
    await prev.click();
    await page.waitForTimeout(400);
  }

  await page.waitForLoadState('networkidle');
  expect(
    await page.locator('.fc-event').count(),
    `Aucune séance trouvée après ${maxSteps} semaines en arrière. Les données seed ` +
      `s'arrêtent au ${SEED_SCHOOL_END.toISOString().slice(0, 10)} : vérifier que le seed ` +
      'a bien tourné, ou faire suivre sa fenêtre à la date du jour.',
  ).toBeGreaterThan(0);
}

test.describe('Emploi du temps — filtres simplifiés (issue #120, PR #120)', () => {
  test('enseignant : dropdown « Affichage » unique, et filtres admin', async ({ page }) => {
    test.setTimeout(90_000);
    // --- Enseignant : dropdown « Affichage », valeur par défaut « Mes matières » ---
    await loginAs(page, 'teacher');
    await page.goto('/planning');
    // Scopé au contenu : le NavRail expose aussi un lien « Emploi du temps ».
    await expect(page.getByRole('main').getByText('Emploi du temps', { exact: true })).toBeVisible();

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
    await expect(page.getByRole('main').getByText('Emploi du temps', { exact: true })).toBeVisible();
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
