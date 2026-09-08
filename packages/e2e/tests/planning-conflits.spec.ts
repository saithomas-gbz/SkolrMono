import { test, expect, loginAs, loginApi } from '../fixtures/auth';

/**
 * Conflits d'horaire (#245). Les tests de route vérifient déjà les 409 ; ce que
 * seul un test e2e peut vérifier, c'est ce que l'utilisateur LIT quand il se
 * trompe. Le backend répond en anglais comme le reste du module : sans la
 * traduction du code de conflit, l'interface française afficherait sa phrase
 * telle quelle.
 *
 * Le scénario passe entièrement par l'interface, et soumet DEUX FOIS le même
 * formulaire. C'est ce qui le rend indépendant de l'heure d'exécution : le
 * dialog préremplit ses bornes sur l'instant courant, et l'emploi du temps
 * seedé couvre les journées de classe. Une version antérieure occupait le
 * créneau par l'API avec une fenêtre plus large que celle du dialog — elle
 * passait le soir et échouait en pleine journée, la précondition n'étant pas
 * réellement garantie.
 */

const ROOM = `E2E-CONFLIT-${Date.now()}`;

/** Remplit le formulaire sur CM2-A / Mathématiques / Dev Teacher, puis valide. */
async function soumettreCreneau(page: import('@playwright/test').Page, room: string) {
  await page.getByRole('button', { name: 'Ajouter' }).click();
  await expect(page.locator('#sd-class')).toBeVisible({ timeout: 10_000 });

  await page.locator('#sd-class').click();
  await page.getByRole('option', { name: 'CM2-A' }).click();
  // Les cours de la classe sont chargés après sa sélection.
  await expect(async () => {
    await page.locator('#sd-course').click();
    await expect(page.getByRole('option', { name: 'Mathématiques' })).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 20_000 });
  await page.getByRole('option', { name: 'Mathématiques' }).click();
  await page.locator('#sd-teacher').click();
  await page.getByRole('option', { name: /Dev Teacher/i }).click();
  await page.locator('#sd-room').fill(room);

  await page.getByRole('button', { name: /^(Créer|Enregistrer)$/ }).click();
}

test("un chevauchement d'horaire est refusé et expliqué en français", async ({ page, request }) => {
  const { token } = await loginApi(request, 'admin');

  try {
    await loginAs(page, 'admin');
    await page.goto('/planning');
    await page.waitForLoadState('networkidle');

    const message = page.locator('.p-message');

    // Première tentative : elle réussit si le créneau est libre, ou échoue déjà
    // en conflit si une séance du seed l'occupe — les deux nous conviennent.
    await soumettreCreneau(page, ROOM);
    await page.waitForTimeout(2_000);

    if ((await message.count()) === 0) {
      // Le créneau était libre : la séance vient d'être créée. La même
      // soumission doit maintenant entrer en conflit avec elle.
      await page.waitForLoadState('networkidle');
      await soumettreCreneau(page, `${ROOM}-BIS`);
    }

    await expect(message).toBeVisible({ timeout: 15_000 });
    await expect(message).toContainText('déjà une séance sur ce créneau');
    // Le message anglais du backend ne doit jamais atteindre l'utilisateur.
    await expect(message).not.toContainText('overlapping');
  } finally {
    const list = await request.get('/api/planning/sessions', {
      headers: { authorization: `Bearer ${token}` },
    });
    const sessions = (await list.json()) as { id: string; room: string | null }[];
    for (const s of sessions.filter((x) => x.room?.startsWith(ROOM))) {
      await request.delete(`/api/planning/sessions/${s.id}`, {
        headers: { authorization: `Bearer ${token}` },
      });
    }
  }
});
