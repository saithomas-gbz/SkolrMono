import { test, expect, loginAs, loginApi } from '../fixtures/auth';
import { SEED } from '../fixtures/seed';

/**
 * Rattachement a une classe des la creation du compte, et restriction des
 * matieres visibles par un enseignant a celles que l'administration lui attribue.
 */

const SUFFIXE = Date.now() % 1000000;
const EMAIL_PROF = `prof.${SUFFIXE}@skolr.local`;
const MDP = 'Provisoire-2026';

test.describe.configure({ mode: 'serial' });

test('1. creer un enseignant en le rattachant a une classe et a un cours', async ({ page }) => {
  await loginAs(page, 'admin');
  await page.goto('/admin/users');
  await page.waitForLoadState('networkidle');

  await page.getByRole('button', { name: 'Créer un compte' }).click();
  await page.locator('#creer-email').fill(EMAIL_PROF);
  await page.locator('#creer-role').click();
  await page.getByRole('option', { name: 'Enseignant' }).click();

  // Le champ classe n'apparait que pour les roles qui ont une place en classe.
  await page.locator('#creer-classe').click();
  await page.getByRole('option', { name: 'CM2-A' }).click();

  // Les cours ne sont proposes qu'une fois la classe choisie.
  await page.locator('#creer-cours').click();
  await page.getByRole('option', { name: 'Mathématiques' }).click();
  await page.keyboard.press('Escape');

  await page.locator('#creer-mdp').fill(MDP);
  await page.getByRole('button', { name: 'Créer le compte' }).click();
  await expect(page.getByText(`Compte créé pour ${EMAIL_PROF}`)).toBeVisible({ timeout: 20_000 });
  // Le compte est cree meme si le rattachement echoue : sans cette assertion, le
  // test passerait au vert avec un enseignant rattache a rien.
  await expect(page.getByText('rattachement à la classe a échoué')).toHaveCount(0);
});

test("2. l'API confirme le rattachement et le cours", async ({ request }) => {
  const { token } = await loginApi(request, 'admin');
  const h = { authorization: `Bearer ${token}` };

  const users = await request.get('/api/auth/users?role=TEACHER', { headers: h });
  const { data } = (await users.json()) as { data: { id: string; email: string }[] };
  const prof = data.find((u) => u.email === EMAIL_PROF);
  expect(prof, "l'enseignant doit exister").toBeTruthy();

  const cours = await request.get(
    `/api/class/classes/${SEED.classes.cm2a}/teachers/${prof!.id}/courses`,
    { headers: h },
  );
  expect(cours.status(), "l'enseignant doit etre rattache a la classe").toBe(200);
  const { data: liste } = (await cours.json()) as { data: { name: string }[] };
  expect(liste.map((c) => c.name)).toEqual(['Mathématiques']);
});

test('3. un cours inconnu du module classe est refuse', async ({ request }) => {
  // « Poesie » existe cote grade mais pas cote classe : l'affecter echouerait
  // silencieusement sans cette garde.
  const { token } = await loginApi(request, 'admin');
  const h = { authorization: `Bearer ${token}` };
  const users = await request.get('/api/auth/users?role=TEACHER', { headers: h });
  const { data } = (await users.json()) as { data: { id: string; email: string }[] };
  const prof = data.find((u) => u.email === EMAIL_PROF)!;

  const res = await request.put(
    `/api/class/classes/${SEED.classes.cm2a}/teachers/${prof.id}/courses`,
    { headers: h, data: { courseIds: ['00000000-0000-0000-0000-00000000dead'] } },
  );
  expect(res.status()).toBe(400);
});

test("4. reaffecter les enseignants ne detruit pas les cours attribues", async ({ request }) => {
  const { token } = await loginApi(request, 'admin');
  const h = { authorization: `Bearer ${token}` };
  const users = await request.get('/api/auth/users?role=TEACHER', { headers: h });
  const { data } = (await users.json()) as { data: { id: string; email: string }[] };
  const prof = data.find((u) => u.email === EMAIL_PROF)!;

  const classe = await request.get(`/api/class/classes/${SEED.classes.cm2a}`, { headers: h });
  const { data: c } = (await classe.json()) as {
    data: { classTeachers: { teacherId: string }[] };
  };
  const ids = c.classTeachers.map((t) => t.teacherId);

  // Renvoyer la meme liste : le code reconstruisait tout et perdait les cours.
  const maj = await request.put(`/api/class/classes/${SEED.classes.cm2a}/teachers`, {
    headers: h,
    data: { teacherIds: ids },
  });
  expect(maj.status()).toBe(200);

  const apres = await request.get(
    `/api/class/classes/${SEED.classes.cm2a}/teachers/${prof.id}/courses`,
    { headers: h },
  );
  const { data: liste } = (await apres.json()) as { data: { name: string }[] };
  expect(liste.map((c2) => c2.name), 'les cours doivent survivre a une reaffectation').toEqual([
    'Mathématiques',
  ]);
});

test.afterAll(async ({ request }) => {
  const { token } = await loginApi(request, 'admin');
  const h = { authorization: `Bearer ${token}` };
  const users = await request.get('/api/auth/users?role=TEACHER', { headers: h });
  const { data } = (await users.json()) as { data: { id: string; email: string }[] };
  for (const u of data.filter((x) => x.email.endsWith(`${SUFFIXE}@skolr.local`))) {
    await request.delete(`/api/auth/users/${u.id}`, { headers: h });
  }
});
