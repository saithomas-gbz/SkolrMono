import { test, expect, loginAs } from '../fixtures/auth';

/**
 * Libellé du KPI de tendance (#246).
 *
 * `trendDelta` est l'écart entre les deux derniers points de `trend`, et `trend`
 * est la moyenne pondérée CUMULATIVE recalculée après chaque devoir noté. La
 * carte annonçait « Vs. trimestre précédent », une grandeur que le backend ne
 * calcule pas : il n'existe aucune notion de trimestre, ni en base ni dans l'API.
 *
 * Ce test verrouille l'intention plutôt que la formulation exacte : ce qui doit
 * rester vrai, c'est que la page ne promet pas une comparaison de périodes
 * qu'elle n'est pas capable de faire.
 */

test("le carnet de l'eleve ne promet aucune comparaison de trimestre", async ({ page }) => {
  await loginAs(page, 'student');
  await page.goto('/grades/my-grades');
  await page.waitForLoadState('networkidle');

  // La carte n'apparaît qu'à partir de deux devoirs notés (`trend.length < 2`
  // la masque) : sans elle, l'absence du mot ne prouverait rien.
  const kpis = page.locator('.kpi-row, [class*="kpi"]');
  await expect(kpis.first()).toBeVisible({ timeout: 20_000 });

  const body = await page.locator('body').innerText();
  expect(body, 'aucune mention de trimestre ne doit subsister').not.toMatch(/trimestre/i);
});
