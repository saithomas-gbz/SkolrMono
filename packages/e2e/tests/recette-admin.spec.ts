import { test, expect, loginAs, loginApi } from '../fixtures/auth';
import { SEED, dimanche } from '../fixtures/seed';

/**
 * Parcours administrateur poussé : on traverse tous les écrans que son rôle
 * ouvre, et on vérifie les frontières — ce à quoi il a droit, et ce qui doit lui
 * rester fermé.
 */

const CM2A = SEED.classes.cm2a;
const MATHS = SEED.courses.maths;
const TEACHER = SEED.users.teacher;
const SALLE = `ADMIN-${Date.now() % 100000}`;

test.describe.configure({ mode: 'serial' });

test('1. connexion — atterrit sur son tableau de bord administrateur', async ({ page }) => {
  await loginAs(page, 'admin');
  await expect(page).toHaveURL(/\/admin(\/|$|\?)/, { timeout: 20_000 });
  await expect(page.getByText('Connexion en cours…')).toHaveCount(0);
});

test('2. utilisateurs — la liste des comptes est accessible', async ({ page }) => {
  await loginAs(page, 'admin');
  await page.goto('/admin/users');
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('table')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('dev.teacher@skolr.local').first()).toBeVisible();
});

test('3. eleves — la liste des eleves de l etablissement est accessible', async ({ page }) => {
  await loginAs(page, 'admin');
  await page.goto('/admin/students');
  await page.waitForLoadState('networkidle');
  await expect(page).not.toHaveURL(/\/auth\/login/);
  await expect(page.getByText('Léa Martin').first()).toBeVisible({ timeout: 20_000 });
});

test('4. matieres — la page matieres et cours est accessible', async ({ page }) => {
  await loginAs(page, 'admin');
  await page.goto('/admin/subjects');
  await page.waitForLoadState('networkidle');
  await expect(page).not.toHaveURL(/\/auth\/login/);
  await expect(page.getByText('Mathématiques').first()).toBeVisible({ timeout: 20_000 });
});

test('5. liens parent-enfant — le registre est accessible', async ({ page }) => {
  await loginAs(page, 'admin');
  await page.goto('/admin/parent-links');
  await page.waitForLoadState('networkidle');
  const ligne = page.locator('tr').filter({ hasText: 'Sophie Martin' });
  await expect(ligne.first()).toBeVisible({ timeout: 20_000 });
});

test("6. facturation — l'abonnement de l'etablissement est affiche", async ({ page }) => {
  await loginAs(page, 'admin');
  await page.goto('/admin/billing');
  await page.waitForLoadState('networkidle');
  await expect(page).not.toHaveURL(/\/auth\/login/);
  // billing.title, puis billing.choose_plan : la page a bien charge son
  // etablissement, elle ne s'est pas arretee sur une erreur ni sur le
  // spinner. billing.choose_plan est le titre de la grille d'offres.
  await expect(page.getByText('Facturation', { exact: true }).first()).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByRole('heading', { name: 'Choisir un plan' })).toBeVisible();
});

test('7. statistiques — accessibles a l administrateur', async ({ page }) => {
  await loginAs(page, 'admin');
  await page.goto('/statistics');
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveURL(/\/statistics/, { timeout: 20_000 });
});

test('8. absences — la file de validation est accessible', async ({ page }) => {
  await loginAs(page, 'admin');
  await page.goto('/planning/absences');
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveURL(/\/planning\/absences/, { timeout: 20_000 });
  await expect(page.getByRole('tab').first()).toBeVisible({ timeout: 20_000 });
});

test('9. planning — pose, modifie et supprime un creneau', async ({ request }) => {
  const { token } = await loginApi(request, 'admin');
  const h = { authorization: `Bearer ${token}` };

  const cree = await request.post('/api/planning/sessions', {
    headers: h,
    data: {
      classId: CM2A, courseId: MATHS, teacherId: TEACHER, room: SALLE,
      startAt: dimanche(9).toISOString(), endAt: dimanche(10).toISOString(),
    },
  });
  expect(cree.status()).toBe(201);
  const { id } = (await cree.json()) as { id: string };

  const patch = await request.patch(`/api/planning/sessions/${id}`, {
    headers: h, data: { room: `${SALLE}-MOD` },
  });
  expect(patch.status()).toBe(200);

  const del = await request.delete(`/api/planning/sessions/${id}`, { headers: h });
  expect(del.status()).toBe(204);
});

test('10. carnet — l administrateur consulte le carnet d une classe', async ({ page }) => {
  await loginAs(page, 'admin');
  await page.goto(`/grades/classes/${CM2A}`);
  await page.waitForLoadState('networkidle');
  await expect(page).not.toHaveURL(/\/auth\/login/);
  await expect(page.locator('table')).toBeVisible({ timeout: 20_000 });
});

test('11. frontieres — les espaces des autres roles lui restent fermes', async ({ page }) => {
  await loginAs(page, 'admin');

  // Vue plateforme : reservee au PLATFORM_ADMIN, qui n'appartient a aucun
  // etablissement — le backend la refuse aussi a l'ADMIN.
  await page.goto('/platform');
  await expect(page).not.toHaveURL(/\/platform/, { timeout: 15_000 });

  // Carnet personnel d'un eleve.
  await page.goto('/grades/my-grades');
  await expect(page).not.toHaveURL(/\/grades\/my-grades/, { timeout: 15_000 });

  // Espace famille.
  await page.goto('/parent');
  await expect(page).not.toHaveURL(/\/parent$/, { timeout: 15_000 });
});

test('12. frontieres API — les routes reservees lui sont refusees', async ({ request }) => {
  const { token } = await loginApi(request, 'admin');
  const h = { authorization: `Bearer ${token}` };

  const plateforme = await request.get('/api/billing/establishments', { headers: h });
  expect(plateforme.status(), 'la liste plateforme est reservee au PLATFORM_ADMIN').toBe(403);
});

test.afterAll(async ({ request }) => {
  const { token } = await loginApi(request, 'admin');
  const list = await request.get('/api/planning/sessions', {
    headers: { authorization: `Bearer ${token}` },
  });
  const sessions = (await list.json()) as { id: string; room: string | null }[];
  for (const s of sessions.filter((x) => x.room?.startsWith(SALLE))) {
    await request.delete(`/api/planning/sessions/${s.id}`, {
      headers: { authorization: `Bearer ${token}` },
    });
  }
});
