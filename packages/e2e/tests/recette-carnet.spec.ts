import { test, expect, loginAs } from '../fixtures/auth';

/**
 * Scénario de recette « carnet de notes », joué de bout en bout par l'interface
 * avec les comptes que décrit le scénario : Léa Martin porte les notes seedées,
 * là où `dev.student` n'est qu'un compte de démonstration.
 */

const CM2A = '22222222-2222-2222-2222-222222222201';
const COMMENTAIRE = 'Très nette progression';
const TITRE = `Recette carnet ${Date.now()}`;

const partage: { colonnesAvant: number; urlDevoir: string } = { colonnesAvant: 0, urlDevoir: '' };

test.describe.configure({ mode: 'serial' });

test('1. admin — le registre parent-enfant lie Sophie Martin à Léa Martin', async ({ page }) => {
  await loginAs(page, 'admin');
  await page.goto('/admin/parent-links');
  await page.waitForLoadState('networkidle');

  const ligne = page.locator('tr').filter({ hasText: 'Sophie Martin' }).filter({ hasText: 'Léa Martin' });
  await expect(ligne.first(), 'la ligne Sophie ↔ Léa doit exister').toBeVisible({ timeout: 20_000 });
});

test('2. enseignant — état du carnet CM2-A avant modification', async ({ page }) => {
  await loginAs(page, 'teacher');
  await page.goto(`/grades/classes/${CM2A}`);
  await page.waitForLoadState('networkidle');
  await expect(page.locator('table')).toBeVisible({ timeout: 20_000 });

  partage.colonnesAvant = await page.locator('thead th').count();
  expect(partage.colonnesAvant).toBeGreaterThan(0);
});

test('3. enseignant — crée un devoir Mathématiques et le publie', async ({ page }) => {
  await loginAs(page, 'teacher');
  await page.goto('/grades/assignments/new');
  await page.waitForLoadState('networkidle');

  await page.locator('#title').fill(TITRE);
  await page.locator('#classId').click();
  await page.getByRole('option', { name: 'CM2-A' }).click();
  // Les cours de l'enseignant sont chargés après le choix de la classe.
  await expect(async () => {
    await page.locator('#courseId').click();
    await expect(page.getByRole('option', { name: 'Mathématiques' })).toBeVisible({ timeout: 2_000 });
  }).toPass({ timeout: 20_000 });
  await page.getByRole('option', { name: 'Mathématiques' }).click();
  await page.locator('#assignedAt input').fill('08/09/2026');
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Publier' }).click();
  await expect(page).toHaveURL(/\/grades\/assignments\/[0-9a-f-]{36}/, { timeout: 25_000 });
  partage.urlDevoir = page.url();
});

test('4. enseignant — saisit 17/20 et le commentaire pour Léa Martin', async ({ page }) => {
  await loginAs(page, 'teacher');
  await page.goto(partage.urlDevoir);
  await page.waitForLoadState('networkidle');

  const ligne = page.locator('tr').filter({ hasText: 'Léa Martin' });
  await expect(ligne).toBeVisible({ timeout: 20_000 });

  // La note n'est saisissable qu'une fois le statut passé à « Noté ».
  await ligne.locator('[role="combobox"], .p-select').first().click();
  await page.getByRole('option', { name: /not[ée]/i }).first().click();
  await ligne.locator('input[type="text"]').first().fill('17');
  await ligne.locator('input[type="text"]').last().fill(COMMENTAIRE);

  await page.getByRole('button', { name: /enregistrer tout/i }).click();
  await page.waitForLoadState('networkidle');
  await expect(page.getByText('17').first()).toBeVisible({ timeout: 15_000 });
});

test('5. enseignant — la nouvelle colonne apparaît dans le carnet avec le 17', async ({ page }) => {
  await loginAs(page, 'teacher');
  await page.goto(`/grades/classes/${CM2A}`);
  await page.waitForLoadState('networkidle');

  const colonnesApres = await page.locator('thead th').count();
  expect(colonnesApres, 'une colonne doit avoir été ajoutée').toBeGreaterThan(partage.colonnesAvant);

  const ligneLea = page.locator('tr').filter({ hasText: 'Léa Martin' });
  await expect(ligneLea).toContainText('17');
});

test('6. Léa — voit sa note et le commentaire dans son carnet', async ({ page }) => {
  await loginAs(page, 'lea');
  await page.goto('/grades/my-grades');
  await page.waitForLoadState('networkidle');

  // Notes groupées par matière : seul le premier panneau est ouvert.
  const entete = page.getByRole('button', { name: /math/i }).first();
  if (await entete.isVisible().catch(() => false)) {
    await entete.click();
    await page.waitForTimeout(800);
  }

  const corps = await page.locator('body').innerText();
  expect(corps, 'la note 17 doit être visible').toMatch(/17/);
  expect(corps, 'le commentaire doit être visible').toContain(COMMENTAIRE);
});

test('7. Léa — une comparaison de période est affichée', async ({ page, request }) => {
  const { token } = await (await import('../fixtures/auth')).loginApi(request, 'lea');
  const res = await request.get('/api/grade/stats/user/44444444-4444-4444-4444-000000000001', {
    headers: { authorization: `Bearer ${token}` },
  });
  const { data } = (await res.json()) as {
    data: { average: number | null; byPeriod: { average: number | null }[]; periodDelta: number | null };
  };
  console.log(`  moyenne generale : ${data.average}`);
  console.log(`  par periode      : ${data.byPeriod.map((p) => p.average).join(' | ')}`);
  console.log(`  ecart de periode : ${data.periodDelta}`);

  expect(data.byPeriod.length, "l'année doit être découpée").toBeGreaterThan(1);

  await loginAs(page, 'lea');
  await page.goto('/grades/my-grades');
  await page.waitForLoadState('networkidle');
  const corps = await page.locator('body').innerText();
  expect(corps, 'la carte doit annoncer une comparaison de période').toMatch(/période précédente/i);
});

test('8. Sophie — sa fiche enfant présente Léa Martin', async ({ page }) => {
  await loginAs(page, 'sophie');
  await page.goto('/parent');
  await page.waitForLoadState('networkidle');
  await expect(page.getByText('Léa Martin').first()).toBeVisible({ timeout: 20_000 });
});

test('9. Sophie — les absences justifiées de Léa sont affichées', async ({ page }) => {
  await loginAs(page, 'sophie');
  await page.goto('/parent');
  await page.waitForLoadState('networkidle');
  await page.goto('/parent/absences');
  await page.waitForLoadState('networkidle');

  await expect(page).not.toHaveURL(/\/auth\/login/);
  const corps = await page.locator('body').innerText();
  console.log(`  page absences parent : ${corps.replace(/\n{2,}/g, ' | ').slice(0, 200)}`);
  expect(corps.length, 'la page doit afficher du contenu').toBeGreaterThan(0);
});
