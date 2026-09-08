import { test, expect, loginAs, loginApi } from '../fixtures/auth';

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

const ROOM = `E2E-SUPPR-${Date.now()}`;

type SessionApi = { id: string; classId: string; courseId: string; teacherId: string };

/**
 * Dimanche 10:00 de la semaine affichée. Le calendrier ouvre sur la semaine
 * courante (lundi → dimanche, `firstDay: 1`) et n'affiche que 08:00–19:00 : le
 * créneau est donc visible, et le dimanche n'est occupé par aucune séance du
 * seed, ce qui évite un 409 de conflit à la création.
 */
function creneauDimanche(): { startAt: string; endAt: string } {
  const start = new Date();
  const jour = start.getDay(); // 0 = dimanche
  start.setDate(start.getDate() + (jour === 0 ? 0 : 7 - jour));
  start.setHours(10, 0, 0, 0);
  const end = new Date(start.getTime() + 45 * 60 * 1000);
  return { startAt: start.toISOString(), endAt: end.toISOString() };
}

test('un admin supprime une séance depuis le dialog', async ({ page, request }) => {
  const { token } = await loginApi(request, 'admin');
  const headers = { authorization: `Bearer ${token}` };

  // Classe/matière/enseignant repris d'une séance existante : la création ne
  // valide pas ces relations, mais réutiliser un triplet réel garde la séance
  // affichable (le calendrier résout les libellés depuis ces identifiants).
  const existantes = (await (
    await request.get('/api/planning/sessions', { headers })
  ).json()) as SessionApi[];
  const modele = existantes[0];
  expect(modele, "l'emploi du temps seedé doit contenir au moins une séance").toBeTruthy();

  const creation = await request.post('/api/planning/sessions', {
    headers,
    data: {
      classId: modele!.classId,
      courseId: modele!.courseId,
      teacherId: modele!.teacherId,
      room: ROOM,
      ...creneauDimanche(),
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
    await evenement.click();

    const supprimer = page.getByRole('button', { name: 'Supprimer la séance' });
    await expect(supprimer).toBeVisible({ timeout: 10_000 });
    await supprimer.click();

    // Confirmation en deux temps : le premier clic ne doit rien avoir supprimé.
    await expect(page.getByText('Supprimer cette séance ?')).toBeVisible();
    expect((await request.get(`/api/planning/sessions/${seance.id}`, { headers })).status()).toBe(
      200,
    );

    await page.getByRole('button', { name: 'Oui', exact: true }).click();

    await expect(evenement).toHaveCount(0, { timeout: 20_000 });
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
