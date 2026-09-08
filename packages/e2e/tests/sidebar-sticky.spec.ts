import { test, expect, loginAs } from '../fixtures/auth';

/**
 * La barre de navigation laterale doit rester visible pendant le defilement.
 *
 * Elle vivait dans une grille avec `height: 100%` : sur une page plus haute que
 * la fenetre, elle defilait avec le contenu et disparaissait, obligeant a
 * remonter pour changer de section.
 */

/** Page suffisamment longue pour defiler quel que soit le jeu de donnees. */
async function pageQuiDefile(page: import('@playwright/test').Page) {
  await page.setViewportSize({ width: 1280, height: 600 });
  await loginAs(page, 'admin');
  await page.goto('/admin/students');
  await page.waitForLoadState('networkidle');
  const hauteur = await page.evaluate(() => document.documentElement.scrollHeight);
  const fenetre = await page.evaluate(() => window.innerHeight);
  expect(hauteur, 'la page doit etre plus haute que la fenetre pour que le test ait un sens').toBeGreaterThan(
    fenetre + 200,
  );
}

test('la navigation laterale reste visible apres defilement', async ({ page }) => {
  await pageQuiDefile(page);

  const rail = page.locator('.nav-rail');
  await expect(rail).toBeVisible();
  const avant = await rail.boundingBox();
  expect(avant).not.toBeNull();

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(500);

  const apres = await rail.boundingBox();
  expect(apres, 'la barre doit encore avoir une boite apres defilement').not.toBeNull();

  // Le haut de la barre doit rester dans la fenetre : s'il est remonte au-dessus
  // de zero, elle a defile avec la page.
  const fenetre = await page.evaluate(() => window.innerHeight);
  expect(
    apres!.y,
    `haut de la barre a ${apres!.y}px apres defilement (etait a ${avant!.y}px)`,
  ).toBeGreaterThanOrEqual(-1);
  expect(apres!.y).toBeLessThan(fenetre);

  // Et un lien de navigation doit rester cliquable sans remonter.
  const lien = page.locator('.nav-rail a').first();
  await expect(lien).toBeInViewport();
});
