import { test, expect, loginAs, loginApi } from '../fixtures/auth';
import { SEED } from '../fixtures/seed';

/**
 * Suppression d'une séance depuis l'interface (#292).
 *
 * `DELETE /planning/sessions/:id` était déjà couvert côté routes ; ce que seul
 * un test e2e vérifie, c'est que l'action est ATTEIGNABLE. Le composable et le
 * handler existaient, mais aucun élément d'interface ne les appelait : la
 * suppression n'était possible qu'en tapant sur l'API à la main.
 *
 * La séance de travail est posée par l'API puis retirée par l'interface, plutôt
 * que d'en supprimer une du seed — le reste de la suite s'appuie sur l'emploi du
 * temps seedé.
 */

// Vidéo activée pour cette spec uniquement (démo PR #293) — pas de changement
// global de playwright.config.ts. L'enregistrement du parcours est figé dans
// `demo/suppression-seance-pr293.webm`.
test.use({ video: 'on' });

/**
 * Temps de pause du parcours filmé. Les assertions n'en ont pas besoin —
 * Playwright attend déjà —, mais sans eux le dialog et sa confirmation
 * n'occupent qu'une poignée d'images et la vidéo ne montre rien de lisible.
 */
const PAUSE_DEMO = 1_200;

const ROOM = `E2E-SUPPR-${Date.now()}`;

type SessionApi = { id: string };

/**
 * Dimanche 16:00 **de la semaine affichée**, en heure locale.
 *
 * Le `dimanche()` de `fixtures/seed` ne convient pas ici : il vise le dimanche
 * SUIVANT, hors de la semaine ouverte par le calendrier quand le test tourne un
 * dimanche, et raisonne en UTC alors que la grille n'affiche que 08:00–19:00 en
 * heure locale. La séance doit être cliquable, donc les deux comptent.
 *
 * 16:00 plutôt que le matin : `recette-planning` et `recette-admin` occupent
 * déjà le dimanche matin pour CM2-A, et un chevauchement ferait échouer leur
 * propre création par un 409 selon l'ordre d'exécution.
 */
function dimancheApresMidi(): { startAt: string; endAt: string } {
  const start = new Date();
  const jour = start.getDay(); // 0 = dimanche
  start.setDate(start.getDate() + (jour === 0 ? 0 : 7 - jour));
  start.setHours(16, 0, 0, 0);
  const end = new Date(start.getTime() + 45 * 60 * 1000);
  return { startAt: start.toISOString(), endAt: end.toISOString() };
}

test('un admin supprime une séance depuis le dialog', async ({ page, request }) => {
  const { token } = await loginApi(request, 'admin');
  const headers = { authorization: `Bearer ${token}` };

  // Identifiants du seed : le calendrier compose le libellé de la séance à
  // partir de la matière et de l'enseignant, une séance rattachée à des
  // identifiants inventés s'afficherait sans titre.
  const creation = await request.post('/api/planning/sessions', {
    headers,
    data: {
      classId: SEED.classes.cm2a,
      courseId: SEED.courses.maths,
      teacherId: SEED.users.teacher,
      room: ROOM,
      ...dimancheApresMidi(),
    },
  });
  expect(creation.status()).toBe(201);
  const seance = (await creation.json()) as SessionApi;

  try {
    await loginAs(page, 'admin');
    await page.goto('/planning');
    await page.waitForLoadState('networkidle');

    const evenement = page.locator('.fc-event').filter({ hasText: ROOM });
    await expect(evenement).toBeVisible({ timeout: 20_000 });
    // La grille s'ouvre sur le matin : le créneau de l'après-midi est sous la
    // ligne de flottaison, et resterait hors champ de la vidéo.
    await evenement.scrollIntoViewIfNeeded();
    await page.waitForTimeout(PAUSE_DEMO);

    await evenement.click();

    const supprimer = page.getByRole('button', { name: 'Supprimer la séance' });
    await expect(supprimer).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(PAUSE_DEMO);
    await supprimer.click();

    // Confirmation en deux temps : le premier clic ne doit rien avoir supprimé.
    await expect(page.getByText('Supprimer cette séance ?')).toBeVisible();
    expect((await request.get(`/api/planning/sessions/${seance.id}`, { headers })).status()).toBe(
      200,
    );
    await page.waitForTimeout(PAUSE_DEMO);

    await page.getByRole('button', { name: 'Oui', exact: true }).click();

    await expect(evenement).toHaveCount(0, { timeout: 20_000 });
    await page.waitForTimeout(PAUSE_DEMO);
    expect((await request.get(`/api/planning/sessions/${seance.id}`, { headers })).status()).toBe(
      404,
    );
  } finally {
    // Filet si le scénario s'arrête avant la suppression par l'interface.
    await request.delete(`/api/planning/sessions/${seance.id}`, { headers });
  }
});

test("le dialog de création n'expose pas la suppression", async ({ page }) => {
  await loginAs(page, 'admin');
  await page.goto('/planning');
  await page.waitForLoadState('networkidle');

  await page.getByRole('button', { name: 'Ajouter' }).click();
  await expect(page.locator('#sd-class')).toBeVisible({ timeout: 10_000 });

  await expect(page.getByRole('button', { name: 'Supprimer la séance' })).toHaveCount(0);
});
