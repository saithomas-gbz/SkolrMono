import { test, expect, loginAs, loginApi } from '../fixtures/auth';

/**
 * Une absence d'enseignant doit se voir dans l'emploi du temps.
 *
 * Declarer l'absence sert a prevenir. Le calendrier ne consommant que les
 * seances, le creneau s'affichait a l'identique : les eleves de la classe se
 * presentaient a un cours qui n'aurait pas lieu.
 */

const partage = { sessionId: '', jour: '' };

test.describe.configure({ mode: 'serial' });

test('0. declarer un enseignant absent sur une seance a venir', async ({ request }) => {
  const { token } = await loginApi(request, 'admin');
  const h = { authorization: `Bearer ${token}` };

  const sessions = (await (await request.get('/api/planning/sessions', { headers: h })).json()) as
    { id: string; teacherId: string; startAt: string }[];
  const futures = sessions
    .filter((s) => new Date(s.startAt) > new Date())
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
  const cible = futures[0];
  expect(cible, 'il faut une seance a venir').toBeTruthy();

  partage.sessionId = cible!.id;
  partage.jour = cible!.startAt.slice(0, 10);

  const r = await request.post('/api/planning/absences', {
    headers: h,
    data: { userId: cible!.teacherId, sessionId: cible!.id, role: 'TEACHER', justified: false },
  });
  expect([200, 201, 409]).toContain(r.status());
});

test("1. le creneau est marque dans l'emploi du temps", async ({ page }) => {
  await loginAs(page, 'admin');
  await page.goto(`/planning?date=${partage.jour}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2500);

  const marque = page.locator('.fc-event.is-teacher-absent');
  const n = await marque.count();
  console.log('  creneaux marques absents :', n);
  expect(n, 'au moins un creneau doit porter la marque').toBeGreaterThan(0);

  // `innerText` rend le texte tel qu'affiche : le libelle est mis en capitales
  // par le CSS, une comparaison sensible a la casse echouerait sur un rendu
  // pourtant correct.
  const texte = await marque.first().innerText();
  console.log('  contenu du creneau : ' + texte.replace(/\n/g, ' | '));
  expect(texte.toLowerCase()).toContain('enseignant absent');
});

test('2. un eleve de la classe le voit aussi', async ({ page }) => {
  // C'est le point : l'information doit atteindre ceux qui se deplacent.
  await loginAs(page, 'lea');
  await page.goto(`/planning?date=${partage.jour}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2500);
  const corps = (await page.locator('main').innerText()).toLowerCase();
  console.log('  vue eleve contient la mention : ' + corps.includes('enseignant absent'));
  expect(corps, "l'eleve doit voir que le cours n'aura pas lieu").toContain('enseignant absent');
});

test.afterAll(async ({ request }) => {
  const { token } = await loginApi(request, 'admin');
  const h = { authorization: `Bearer ${token}` };
  const abs = (await (await request.get('/api/planning/absences?role=TEACHER', { headers: h })).json()) as
    { id: string; sessionId: string }[] | { data: { id: string; sessionId: string }[] };
  const liste = Array.isArray(abs) ? abs : abs.data;
  for (const a of liste.filter((x) => x.sessionId === partage.sessionId)) {
    await request.delete(`/api/planning/absences/${a.id}`, { headers: h });
  }
});
