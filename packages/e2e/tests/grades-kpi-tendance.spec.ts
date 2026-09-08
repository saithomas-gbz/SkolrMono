import { test, expect, loginAs, loginApi } from '../fixtures/auth';

/**
 * Comparaison de moyenne entre périodes (#254).
 *
 * #246 avait retiré la promesse « Vs. trimestre précédent », que le backend ne
 * savait pas tenir. La comparaison existe désormais réellement : l'année
 * scolaire est découpée en trois périodes dérivées des séances planifiées, et
 * l'écart porte sur les deux dernières périodes renseignées.
 *
 * Ce test vérifie que la valeur affichée vient bien du calcul par période, et
 * pas d'un reliquat de l'ancienne tendance par devoir.
 */

const STUDENT_ID = '11111111-1111-1111-1111-111111111104';

test('la carte de tendance reflète la comparaison entre périodes', async ({ page, request }) => {
  const { token } = await loginApi(request, 'student');
  const res = await request.get(`/api/grade/stats/user/${STUDENT_ID}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  expect(res.status()).toBe(200);
  const { data } = (await res.json()) as {
    data: { byPeriod: { average: number | null }[]; periodDelta: number | null };
  };

  // L'API doit découper l'année, sinon la carte n'aurait rien à afficher et le
  // test passerait pour la mauvaise raison.
  expect(data.byPeriod.length, "l'année doit être découpée en périodes").toBeGreaterThan(1);
  const renseignees = data.byPeriod.filter((p) => p.average !== null).length;
  expect(renseignees, 'au moins deux périodes doivent porter une moyenne').toBeGreaterThan(1);
  expect(data.periodDelta).not.toBeNull();

  await loginAs(page, 'student');
  await page.goto('/grades/my-grades');
  await page.waitForLoadState('networkidle');

  const kpis = page.locator('.kpi-row, [class*="kpi"]');
  await expect(kpis.first()).toBeVisible({ timeout: 20_000 });

  const body = await page.locator('body').innerText();
  expect(body, 'la carte doit annoncer une comparaison de période').toMatch(/période précédente/i);

  // La valeur affichée est arrondie au dixième par `roundScore`. On vérifie
  // qu'elle correspond bien à l'écart de période renvoyé par l'API, et non à un
  // autre calcul — c'est tout l'objet de ce test.
  const attendu = Math.round(data.periodDelta! * 10) / 10;
  const signe = attendu > 0 ? '+' : '';
  expect(body, `l'écart affiché doit être ${signe}${attendu}`).toContain(`${signe}${attendu}`);
});
