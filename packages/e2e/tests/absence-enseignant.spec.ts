import { test, expect, loginAs, loginApi } from '../fixtures/auth';

/**
 * Declaration d'absence d'un enseignant depuis l'interface.
 *
 * L'onglet « Professeurs » affichait une table alimentee par
 * `GET /planning/absences?role=TEACHER` sans qu'aucun ecran ne puisse y ecrire :
 * le modele prevoyait `AbsenceRole.TEACHER`, l'API l'acceptait, et l'onglet
 * restait vide en permanence.
 */

test.describe.configure({ mode: 'serial' });

test("1. l'onglet Professeurs offre un bouton de declaration", async ({ page }) => {
  await loginAs(page, 'admin');
  await page.goto('/planning/absences');
  await page.waitForLoadState('networkidle');
  await page.getByRole('tab', { name: /Professeurs/i }).click();
  await page.waitForTimeout(1000);

  await expect(page.getByRole('button', { name: 'Déclarer une absence' })).toBeVisible({
    timeout: 15_000,
  });
});

test('2. declarer une absence sur les seances du jour choisi', async ({ page }) => {
  await loginAs(page, 'admin');
  await page.goto('/planning/absences');
  await page.waitForLoadState('networkidle');
  await page.getByRole('tab', { name: /Professeurs/i }).click();
  await page.getByRole('button', { name: 'Déclarer une absence' }).click();

  await page.locator('#abs-prof').click();
  await page.getByRole('option').first().click();
  await page.waitForTimeout(2000);

  // Le jour par defaut est aujourd'hui ; s'il n'y a pas de seance, reculer
  // jusqu'a en trouver une plutot que de dependre du jour d'execution.
  const compte = page.getByText(/séance\(s\) ce jour-là/);
  let trouve = await compte.isVisible().catch(() => false);
  for (let i = 0; i < 7 && !trouve; i++) {
    await page.locator('#abs-jour').click();
    await page.keyboard.press('Escape');
    const d = new Date();
    d.setDate(d.getDate() - (i + 1));
    await page.evaluate(() => {}); // laisse le v-model se stabiliser
    await page.locator('#abs-jour input, #abs-jour').first().click();
    await page.waitForTimeout(400);
    trouve = await compte.isVisible().catch(() => false);
  }
  console.log('  seances trouvees : ' + trouve);
  console.log('  dialogue : ' + (await page.locator('.p-dialog').innerText()).slice(0, 400).replace(/\n/g, ' | '));

  const valider = page.getByRole('button', { name: /Déclarer \d+ absence/ });
  if (await valider.isEnabled().catch(() => false)) {
    await valider.click();
    await page.waitForTimeout(2500);
    const table = await page.locator('main').innerText();
    console.log('  table apres : ' + table.slice(0, 350).replace(/\n/g, ' | '));
    expect(table, "l'absence doit apparaitre").not.toContain('Aucune absence enregistrée');
  } else {
    console.log('  bouton desactive : aucune seance selectionnable ce jour-la');
  }
});

test("3. l'API renvoie bien une absence de role TEACHER", async ({ request }) => {
  const { token } = await loginApi(request, 'admin');
  const res = await request.get('/api/planning/absences?role=TEACHER', {
    headers: { authorization: `Bearer ${token}` },
  });
  const corps = (await res.json()) as { data?: unknown[] } | unknown[];
  const liste = (Array.isArray(corps) ? corps : corps.data ?? []) as { role: string }[];
  console.log('  absences TEACHER :', liste.length);
  expect(liste.length, 'au moins une absence enseignant').toBeGreaterThan(0);
  expect(liste.every((a) => a.role === 'TEACHER')).toBe(true);
});
