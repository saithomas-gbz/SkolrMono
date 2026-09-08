import { test, expect, loginAs, loginApi } from '../fixtures/auth';
import { dimanche } from '../fixtures/seed';

/**
 * Scénario de recette « emploi du temps », joué de bout en bout par l'interface.
 *
 * Les créneaux sont posés un jour de week-end de la semaine seedée : l'emploi du
 * temps ne couvre que les jours de classe, ce qui donne une plage libre et rend
 * le scénario indépendant de l'heure d'exécution — le piège corrigé en #260.
 */

const SALLE = `RECETTE-${Date.now() % 100000}`;

test.describe.configure({ mode: 'serial' });

test('1-2. admin — ouvre le planning et la grille hebdomadaire', async ({ page }) => {
  await loginAs(page, 'admin');
  await page.goto('/planning');
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('main').getByText('Emploi du temps', { exact: true })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.locator('.fc')).toBeVisible({ timeout: 20_000 });
});

test('3-4. admin — pose deux creneaux consecutifs pour dev.teacher', async ({ request }) => {
  const { token } = await loginApi(request, 'admin');
  const h = (headers: string) => ({ authorization: `Bearer ${headers}` });

  const maths = await request.post('/api/planning/sessions', {
    headers: h(token),
    data: {
      classId: '22222222-2222-2222-2222-222222222201',
      courseId: '33333333-3333-3333-3333-333333333302',
      teacherId: '11111111-1111-1111-1111-111111111103',
      room: `${SALLE}-MATHS`,
      startAt: dimanche(9).toISOString(),
      endAt: dimanche(10).toISOString(),
    },
  });
  expect(maths.status(), 'le premier creneau doit etre accepte').toBe(201);

  const francais = await request.post('/api/planning/sessions', {
    headers: h(token),
    data: {
      classId: '22222222-2222-2222-2222-222222222201',
      courseId: '33333333-3333-3333-3333-333333333304',
      teacherId: '11111111-1111-1111-1111-111111111103',
      room: `${SALLE}-FR`,
      startAt: dimanche(10, 15).toISOString(),
      endAt: dimanche(11, 15).toISOString(),
    },
  });
  expect(francais.status(), 'un creneau adjacent ne doit pas etre un conflit').toBe(201);
});

test('5. admin — un creneau qui chevauche le meme enseignant est refuse', async ({ request }) => {
  const { token } = await loginApi(request, 'admin');
  const res = await request.post('/api/planning/sessions', {
    headers: { authorization: `Bearer ${token}` },
    data: {
      classId: '22222222-2222-2222-2222-222222222201',
      courseId: '33333333-3333-3333-3333-333333333303',
      teacherId: '11111111-1111-1111-1111-111111111103',
      room: `${SALLE}-CONFLIT`,
      startAt: dimanche(9, 30).toISOString(),
      endAt: dimanche(10, 30).toISOString(),
    },
  });
  expect(res.status(), 'le chevauchement doit etre refuse').toBe(409);
  const body = (await res.json()) as { code?: string };
  expect(body.code, 'un code stable doit accompagner le refus').toBe('SESSION_CONFLICT_TEACHER');
});

test('6. admin — modifier un creneau persiste la modification', async ({ request }) => {
  const { token } = await loginApi(request, 'admin');
  const list = await request.get('/api/planning/sessions', {
    headers: { authorization: `Bearer ${token}` },
  });
  const sessions = (await list.json()) as { id: string; room: string | null }[];
  const cible = sessions.find((s) => s.room === `${SALLE}-MATHS`)!;
  expect(cible, 'le creneau cree doit etre retrouve').toBeTruthy();

  const patch = await request.patch(`/api/planning/sessions/${cible.id}`, {
    headers: { authorization: `Bearer ${token}` },
    data: { room: `${SALLE}-B12` },
  });
  expect(patch.status()).toBe(200);

  const relu = await request.get('/api/planning/sessions', {
    headers: { authorization: `Bearer ${token}` },
  });
  const apres = (await relu.json()) as { room: string | null }[];
  expect(apres.some((s) => s.room === `${SALLE}-B12`), 'la salle doit etre persistee').toBe(true);
});

test('7. admin — supprimer un creneau sans toucher aux autres', async ({ request }) => {
  const { token } = await loginApi(request, 'admin');
  const list = await request.get('/api/planning/sessions', {
    headers: { authorization: `Bearer ${token}` },
  });
  const sessions = (await list.json()) as { id: string; room: string | null }[];
  const aSupprimer = sessions.find((s) => s.room === `${SALLE}-FR`)!;

  const del = await request.delete(`/api/planning/sessions/${aSupprimer.id}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  expect(del.status()).toBe(204);

  const relu = await request.get('/api/planning/sessions', {
    headers: { authorization: `Bearer ${token}` },
  });
  const apres = (await relu.json()) as { room: string | null }[];
  expect(apres.some((s) => s.room === `${SALLE}-FR`), 'le creneau doit avoir disparu').toBe(false);
  expect(apres.some((s) => s.room === `${SALLE}-B12`), "l'autre creneau doit subsister").toBe(true);
});

test('9. enseignant — son tableau de bord annonce ses seances du jour', async ({ page }) => {
  await loginAs(page, 'teacher');
  await page.goto('/teacher');
  await page.waitForLoadState('networkidle');
  await expect(page.getByText(/sessions du jour/i)).toBeVisible({ timeout: 20_000 });
});

test('10. eleve — voit l emploi du temps de sa classe, sans action d edition', async ({ page }) => {
  await loginAs(page, 'lea');
  await page.goto('/planning');
  await page.waitForLoadState('networkidle');

  await expect(page, "l'eleve ne doit pas etre deconnecte").not.toHaveURL(/\/auth\/login/);
  await expect(page.locator('.fc')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('button', { name: 'Ajouter' })).toHaveCount(0);
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
